ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pharmacy_staff';

CREATE TABLE IF NOT EXISTS public.holarchelp_pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  registration_number text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  country text,
  tier public.holarchelp_hospital_tier NOT NULL DEFAULT 'tier_2',
  latitude double precision,
  longitude double precision,
  status public.holarchelp_provider_status NOT NULL DEFAULT 'pending',
  accepting_patients boolean NOT NULL DEFAULT true,
  dispatch_priority integer NOT NULL DEFAULT 100,
  credential_score numeric,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.holarchelp_pharmacies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pharmacies" ON public.holarchelp_pharmacies FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.user_role));

CREATE POLICY "Owners manage own pharmacy" ON public.holarchelp_pharmacies FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated can view approved pharmacies" ON public.holarchelp_pharmacies FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'approved');

CREATE TRIGGER trg_pharmacies_updated_at BEFORE UPDATE ON public.holarchelp_pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.holarchelp_approve_pharmacy(_provider_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;
  UPDATE public.holarchelp_pharmacies SET status='approved', approved_at=now()
    WHERE id=_provider_id RETURNING owner_id INTO _owner;
  INSERT INTO public.user_roles (user_id, role) VALUES (_owner,'pharmacy_staff'::public.user_role) ON CONFLICT DO NOTHING;
END $function$;