-- Referral Agent workflow: a referrer signs up, captures a prospective
-- client and picks a broker (Wealth Manager) to refer them to. The broker
-- accepts (creating the real client record) or rejects (with a reason, so
-- the referrer can pick a different broker). Commission is tracked per
-- referral: an estimated figure set once a quote is prepared, and an actual
-- figure once the policy is issued.

CREATE TABLE IF NOT EXISTS public.wealth_referrer_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_rate numeric NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broker_user_id, referrer_user_id)
);

CREATE TABLE IF NOT EXISTS public.wealth_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  specific_need text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason text,
  commission_rate numeric NOT NULL DEFAULT 10,
  estimated_commission numeric,
  actual_commission numeric,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  workflow_id uuid REFERENCES public.wealth_workflows(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE INDEX IF NOT EXISTS wealth_referrals_referrer_idx ON public.wealth_referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS wealth_referrals_broker_idx ON public.wealth_referrals(broker_user_id);

ALTER TABLE public.wealth_referrer_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_referrals ENABLE ROW LEVEL SECURITY;

-- Broker sets their own standing commission rate per referrer.
CREATE POLICY "Broker manages their referrer rates"
  ON public.wealth_referrer_rates FOR ALL
  USING (broker_user_id = auth.uid())
  WITH CHECK (broker_user_id = auth.uid());

CREATE POLICY "Referrer views rates brokers have set for them"
  ON public.wealth_referrer_rates FOR SELECT
  USING (referrer_user_id = auth.uid());

-- Referrer creates and views their own referrals.
CREATE POLICY "Referrer creates referrals"
  ON public.wealth_referrals FOR INSERT
  WITH CHECK (referrer_user_id = auth.uid());

CREATE POLICY "Referrer views own referrals"
  ON public.wealth_referrals FOR SELECT
  USING (referrer_user_id = auth.uid());

-- Referrer may reassign a rejected referral to a different broker, or edit
-- details, while it isn't accepted yet.
CREATE POLICY "Referrer updates own pending or rejected referrals"
  ON public.wealth_referrals FOR UPDATE
  USING (referrer_user_id = auth.uid() AND status <> 'accepted')
  WITH CHECK (referrer_user_id = auth.uid());

-- Broker sees and actions referrals sent to them.
CREATE POLICY "Broker views referrals sent to them"
  ON public.wealth_referrals FOR SELECT
  USING (broker_user_id = auth.uid());

CREATE POLICY "Broker updates referrals sent to them"
  ON public.wealth_referrals FOR UPDATE
  USING (broker_user_id = auth.uid())
  WITH CHECK (broker_user_id = auth.uid());

-- Notify the broker of a new referral, and the referrer of status/commission changes.
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

    IF NEW.estimated_commission IS NOT NULL AND NEW.estimated_commission IS DISTINCT FROM OLD.estimated_commission THEN
      INSERT INTO public.notifications (user_id, title, description, type, reference_id)
      VALUES (NEW.referrer_user_id, 'Quote prepared', 'A quote was prepared for ' || NEW.client_name || '. Estimated commission: R' || to_char(NEW.estimated_commission, 'FM999,999,990.00'), 'referral_quote', NEW.id);
    END IF;

    IF NEW.actual_commission IS NOT NULL AND NEW.actual_commission IS DISTINCT FROM OLD.actual_commission THEN
      INSERT INTO public.notifications (user_id, title, description, type, reference_id)
      VALUES (NEW.referrer_user_id, 'Commission earned', NEW.client_name || '''s policy was issued. Commission earned: R' || to_char(NEW.actual_commission, 'FM999,999,990.00'), 'referral_commission', NEW.id);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wealth_referral_notify_trigger ON public.wealth_referrals;
CREATE TRIGGER wealth_referral_notify_trigger
  AFTER INSERT OR UPDATE ON public.wealth_referrals
  FOR EACH ROW EXECUTE FUNCTION public.wealth_referral_notify();

-- Notify the referrer when the client accepts, rejects, or asks for changes
-- to a recommendation (quote), for any workflow linked back to a referral.
CREATE OR REPLACE FUNCTION public.wealth_referral_recommendation_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref RECORD;
  verb text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted', 'declined', 'changes_requested') THEN
    SELECT r.id, r.referrer_user_id, r.client_name INTO ref
    FROM public.wealth_referrals r
    JOIN public.wealth_workflows w ON w.patient_id = r.patient_id
    WHERE w.id = NEW.workflow_id AND r.status = 'accepted'
    LIMIT 1;

    IF FOUND THEN
      verb := CASE NEW.status WHEN 'accepted' THEN 'accepted the quote' WHEN 'declined' THEN 'declined the quote' ELSE 'requested changes to the quote' END;
      INSERT INTO public.notifications (user_id, title, description, type, reference_id)
      VALUES (ref.referrer_user_id, 'Client update', ref.client_name || ' has ' || verb || '.', 'referral_client_decision', ref.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wealth_referral_recommendation_notify_trigger ON public.wealth_recommendations;
CREATE TRIGGER wealth_referral_recommendation_notify_trigger
  AFTER UPDATE ON public.wealth_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.wealth_referral_recommendation_notify();

-- Lets a signed-in user list Wealth Managers to refer a client to, without
-- needing broad read access to the profiles table.
CREATE OR REPLACE FUNCTION public.wealth_list_brokers()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.role = 'doctor'
  ORDER BY p.full_name;
$$;

REVOKE ALL ON FUNCTION public.wealth_list_brokers() FROM public;
GRANT EXECUTE ON FUNCTION public.wealth_list_brokers() TO authenticated;
