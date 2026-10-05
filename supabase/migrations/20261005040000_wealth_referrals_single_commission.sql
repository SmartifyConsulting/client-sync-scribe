-- Simplify referral commission to a single figure the broker sets once,
-- based on the quote — no separate "estimated" vs "actual" tracking.
ALTER TABLE public.wealth_referrals ADD COLUMN IF NOT EXISTS commission numeric;
UPDATE public.wealth_referrals SET commission = COALESCE(actual_commission, estimated_commission) WHERE commission IS NULL;
ALTER TABLE public.wealth_referrals DROP COLUMN IF EXISTS estimated_commission;
ALTER TABLE public.wealth_referrals DROP COLUMN IF EXISTS actual_commission;

CREATE OR REPLACE FUNCTION public.wealth_referral_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, description, type, reference_id)
    VALUES (NEW.broker_user_id, 'New client referral', NEW.client_name || ' has been referred to you.', 'referral_new', NEW.id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
      INSERT INTO public.notifications (user_id, title, description, type, reference_id)
      VALUES (NEW.referrer_user_id, 'Referral accepted', 'Your referral for ' || NEW.client_name || ' was accepted.', 'referral_accepted', NEW.id);
    ELSIF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, description, type, reference_id)
      VALUES (NEW.referrer_user_id, 'Referral declined', 'Your referral for ' || NEW.client_name || ' was declined' || COALESCE(': ' || NEW.rejection_reason, '.'), 'referral_rejected', NEW.id);
    END IF;

    IF NEW.commission IS NOT NULL AND NEW.commission IS DISTINCT FROM OLD.commission THEN
      INSERT INTO public.notifications (user_id, title, description, type, reference_id)
      VALUES (NEW.referrer_user_id, 'Commission from quote', NEW.client_name || '''s quote is in. Your commission: R' || to_char(NEW.commission, 'FM999,999,990.00'), 'referral_commission', NEW.id);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Quotes Screen: each broker keeps their own list of insurers and the
-- address (email) they send quote requests to.
CREATE TABLE IF NOT EXISTS public.wealth_insurer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insurer_name text NOT NULL,
  request_address text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broker_user_id, insurer_name)
);

ALTER TABLE public.wealth_insurer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broker manages their own insurer contacts"
  ON public.wealth_insurer_contacts FOR ALL
  USING (broker_user_id = auth.uid())
  WITH CHECK (broker_user_id = auth.uid());
