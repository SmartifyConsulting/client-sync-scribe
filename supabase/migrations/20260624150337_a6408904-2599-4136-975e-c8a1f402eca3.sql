
-- 1) Pharmacy: add missing columns to mirror the other provider tables
ALTER TABLE public.holarchelp_pharmacies
  ADD COLUMN IF NOT EXISTS admin_full_name text,
  ADD COLUMN IF NOT EXISTS admin_email text,
  ADD COLUMN IF NOT EXISTS admin_phone text,
  ADD COLUMN IF NOT EXISTS directors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS license_file_path text,
  ADD COLUMN IF NOT EXISTS license_file_mime text,
  ADD COLUMN IF NOT EXISTS license_file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2) Update duplicate-check to recognise pharmacies
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
  ELSIF _type = 'pharmacy' THEN
    SELECT name INTO _hit FROM public.holarchelp_pharmacies
      WHERE status IN ('pending'::holarchelp_provider_status,'approved'::holarchelp_provider_status)
        AND ((_reg_no IS NOT NULL AND _reg_no <> '' AND lower(registration_number) = lower(_reg_no))
          OR (public.norm_text(name) = public.norm_text(_name)
              AND public.norm_text(city) = public.norm_text(_city)
              AND coalesce(_city,'') <> ''))
      LIMIT 1;
  END IF;
  RETURN jsonb_build_object('exists', _hit IS NOT NULL, 'name', _hit);
END $function$;

-- 3) Approval-token table for one-click approve/reject from email
CREATE TABLE IF NOT EXISTS public.provider_approval_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  provider_kind text NOT NULL CHECK (provider_kind IN ('hospital','esp','insurance','pharmacy')),
  provider_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  used_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.provider_approval_tokens TO service_role;
ALTER TABLE public.provider_approval_tokens ENABLE ROW LEVEL SECURITY;
-- No policies → only service_role bypasses RLS. Tokens are not exposed to authenticated/anon.

-- 4) Approval RPC the edge function calls with the service role
CREATE OR REPLACE FUNCTION public.process_provider_approval(_token uuid, _action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.provider_approval_tokens;
  _owner uuid;
  _org_name text;
BEGIN
  IF _action NOT IN ('approve','reject') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_action');
  END IF;

  SELECT * INTO _row FROM public.provider_approval_tokens WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;
  IF _row.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used', 'action', _row.used_action);
  END IF;
  IF _row.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF _action = 'approve' THEN
    IF _row.provider_kind = 'hospital' THEN
      UPDATE public.holarchelp_hospitals SET status='approved', approved_at=now()
        WHERE id=_row.provider_id RETURNING owner_id, name INTO _owner, _org_name;
      INSERT INTO public.user_roles (user_id, role) VALUES (_owner, 'hospital_staff'::public.user_role) ON CONFLICT DO NOTHING;
    ELSIF _row.provider_kind = 'esp' THEN
      UPDATE public.holarchelp_ambulance_providers SET status='approved', approved_at=now()
        WHERE id=_row.provider_id RETURNING owner_id, company_name INTO _owner, _org_name;
      INSERT INTO public.user_roles (user_id, role) VALUES (_owner, 'ambulance_staff'::public.user_role) ON CONFLICT DO NOTHING;
    ELSIF _row.provider_kind = 'insurance' THEN
      UPDATE public.holarchelp_insurance_providers SET status='approved', approved_at=now()
        WHERE id=_row.provider_id RETURNING owner_id, company_name INTO _owner, _org_name;
      INSERT INTO public.user_roles (user_id, role) VALUES (_owner, 'insurer_staff'::public.user_role) ON CONFLICT DO NOTHING;
    ELSIF _row.provider_kind = 'pharmacy' THEN
      UPDATE public.holarchelp_pharmacies SET status='approved', approved_at=now()
        WHERE id=_row.provider_id RETURNING owner_id, name INTO _owner, _org_name;
      INSERT INTO public.user_roles (user_id, role) VALUES (_owner, 'pharmacy_staff'::public.user_role) ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    IF _row.provider_kind = 'hospital' THEN
      UPDATE public.holarchelp_hospitals SET status='rejected'::holarchelp_provider_status
        WHERE id=_row.provider_id RETURNING name INTO _org_name;
    ELSIF _row.provider_kind = 'esp' THEN
      UPDATE public.holarchelp_ambulance_providers SET status='rejected'::holarchelp_provider_status
        WHERE id=_row.provider_id RETURNING company_name INTO _org_name;
    ELSIF _row.provider_kind = 'insurance' THEN
      UPDATE public.holarchelp_insurance_providers SET status='rejected'::holarchelp_provider_status
        WHERE id=_row.provider_id RETURNING company_name INTO _org_name;
    ELSIF _row.provider_kind = 'pharmacy' THEN
      UPDATE public.holarchelp_pharmacies SET status='rejected'::holarchelp_provider_status
        WHERE id=_row.provider_id RETURNING name INTO _org_name;
    END IF;
  END IF;

  UPDATE public.provider_approval_tokens
    SET used_at = now(), used_action = _action
    WHERE id = _row.id;

  RETURN jsonb_build_object('ok', true, 'action', _action, 'kind', _row.provider_kind, 'org_name', _org_name);
END $function$;

GRANT EXECUTE ON FUNCTION public.process_provider_approval(uuid, text) TO service_role;
