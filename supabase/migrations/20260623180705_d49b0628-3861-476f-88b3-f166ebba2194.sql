
-- 1. Role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'insurer_staff';

-- 2. Table
CREATE TABLE IF NOT EXISTS public.holarchelp_insurance_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_name text NOT NULL,
  insurance_type text NOT NULL DEFAULT 'other',
  registration_number text,
  contact_email text,
  contact_phone text,
  base_address text,
  city text,
  country text DEFAULT 'South Africa',
  ownership text,
  admin_full_name text,
  admin_email text,
  admin_phone text,
  directors jsonb DEFAULT '[]'::jsonb,
  license_file_path text,
  license_file_mime text,
  license_file_size_bytes bigint,
  status public.holarchelp_provider_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  credential_score numeric,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.holarchelp_insurance_providers TO authenticated;
GRANT ALL ON public.holarchelp_insurance_providers TO service_role;

ALTER TABLE public.holarchelp_insurance_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can insert own pending insurer"
  ON public.holarchelp_insurance_providers FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner or admin can read insurer"
  ON public.holarchelp_insurance_providers FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.user_role)
    OR status = 'approved'
  );

CREATE POLICY "Owner or admin can update insurer"
  ON public.holarchelp_insurance_providers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE TRIGGER trg_holarchelp_insurance_providers_updated_at
  BEFORE UPDATE ON public.holarchelp_insurance_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Approve RPC
CREATE OR REPLACE FUNCTION public.holarchelp_approve_insurer(_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;
  UPDATE public.holarchelp_insurance_providers
    SET status='approved', approved_at=now()
    WHERE id = _provider_id
    RETURNING owner_id INTO _owner;
  INSERT INTO public.user_roles (user_id, role)
    VALUES (_owner, 'insurer_staff'::public.user_role)
    ON CONFLICT DO NOTHING;
END $$;

-- 4. Extend duplicate check for insurance
CREATE OR REPLACE FUNCTION public.check_provider_duplicate(_type text, _reg_no text, _name text, _city text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _hit text;
BEGIN
  IF _type = 'hospital' THEN
    SELECT name INTO _hit FROM public.holarchelp_hospitals
      WHERE status IN ('pending'::holarchelp_provider_status,'approved'::holarchelp_provider_status)
        AND ((_reg_no IS NOT NULL AND _reg_no <> '' AND lower(registration_number) = lower(_reg_no))
          OR (public.norm_text(name) = public.norm_text(_name)
              AND public.norm_text(city) = public.norm_text(_city)
              AND coalesce(_city,'') <> ''))
      LIMIT 1;
  ELSIF _type = 'ambulance' THEN
    SELECT company_name INTO _hit FROM public.holarchelp_ambulance_providers
      WHERE status IN ('pending'::holarchelp_provider_status,'approved'::holarchelp_provider_status)
        AND ((_reg_no IS NOT NULL AND _reg_no <> '' AND lower(registration_number) = lower(_reg_no))
          OR (public.norm_text(company_name) = public.norm_text(_name)
              AND public.norm_text(city) = public.norm_text(_city)
              AND coalesce(_city,'') <> ''))
      LIMIT 1;
  ELSIF _type = 'insurance' THEN
    SELECT company_name INTO _hit FROM public.holarchelp_insurance_providers
      WHERE status IN ('pending'::holarchelp_provider_status,'approved'::holarchelp_provider_status)
        AND ((_reg_no IS NOT NULL AND _reg_no <> '' AND lower(registration_number) = lower(_reg_no))
          OR (public.norm_text(company_name) = public.norm_text(_name)
              AND public.norm_text(city) = public.norm_text(_city)
              AND coalesce(_city,'') <> ''))
      LIMIT 1;
  END IF;
  RETURN jsonb_build_object('exists', _hit IS NOT NULL, 'name', _hit);
END $function$;

-- 5. Extend rejection helper
CREATE OR REPLACE FUNCTION public.holarchelp_reject_provider(_provider_id uuid, _kind text, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can reject';
  END IF;
  IF _kind = 'hospital' THEN
    UPDATE public.holarchelp_hospitals
      SET status = 'rejected'::holarchelp_provider_status,
          rejection_reason = _reason
      WHERE id = _provider_id;
  ELSIF _kind = 'ambulance' THEN
    UPDATE public.holarchelp_ambulance_providers
      SET status = 'rejected'::holarchelp_provider_status,
          rejection_reason = _reason
      WHERE id = _provider_id;
  ELSIF _kind = 'insurance' THEN
    UPDATE public.holarchelp_insurance_providers
      SET status = 'rejected'::holarchelp_provider_status,
          rejection_reason = _reason
      WHERE id = _provider_id;
  ELSE
    RAISE EXCEPTION 'Invalid kind: %', _kind;
  END IF;
END $function$;
