
CREATE OR REPLACE FUNCTION public.norm_text(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(trim(coalesce(_t,'')), '\s+', ' ', 'g'))
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_hospitals_regno
  ON public.holarchelp_hospitals (lower(registration_number))
  WHERE registration_number IS NOT NULL
    AND status IN ('pending'::holarchelp_provider_status,'approved'::holarchelp_provider_status);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_amb_regno
  ON public.holarchelp_ambulance_providers (lower(registration_number))
  WHERE registration_number IS NOT NULL
    AND status IN ('pending'::holarchelp_provider_status,'approved'::holarchelp_provider_status);

CREATE OR REPLACE FUNCTION public.check_provider_duplicate(
  _type text, _reg_no text, _name text, _city text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  END IF;
  RETURN jsonb_build_object('exists', _hit IS NOT NULL, 'name', _hit);
END $$;

ALTER TABLE public.holarchelp_hospital_members
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS invited_email text,
  ADD COLUMN IF NOT EXISTS invite_token uuid,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS invited_name text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_hospital_member_invite_token
  ON public.holarchelp_hospital_members (invite_token) WHERE invite_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_hospital_member_pending_email
  ON public.holarchelp_hospital_members (hospital_id, lower(invited_email))
  WHERE invited_email IS NOT NULL AND user_id IS NULL;

ALTER TABLE public.holarchelp_ambulance_members
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS invited_email text,
  ADD COLUMN IF NOT EXISTS invite_token uuid,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS invited_name text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_amb_member_invite_token
  ON public.holarchelp_ambulance_members (invite_token) WHERE invite_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_amb_member_pending_email
  ON public.holarchelp_ambulance_members (provider_id, lower(invited_email))
  WHERE invited_email IS NOT NULL AND user_id IS NULL;

CREATE OR REPLACE FUNCTION public.is_hospital_admin(_hospital_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.holarchelp_hospitals WHERE id=_hospital_id AND owner_id=_user_id)
      OR EXISTS(SELECT 1 FROM public.holarchelp_hospital_members
                 WHERE hospital_id=_hospital_id AND user_id=_user_id AND role='admin');
$$;

CREATE OR REPLACE FUNCTION public.is_ambulance_admin(_provider_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.holarchelp_ambulance_providers WHERE id=_provider_id AND owner_id=_user_id)
      OR EXISTS(SELECT 1 FROM public.holarchelp_ambulance_members
                 WHERE provider_id=_provider_id AND user_id=_user_id AND role='admin');
$$;

DROP POLICY IF EXISTS "Hospital admins manage members" ON public.holarchelp_hospital_members;
CREATE POLICY "Hospital admins manage members"
  ON public.holarchelp_hospital_members
  FOR ALL TO authenticated
  USING (public.is_hospital_admin(hospital_id, auth.uid()))
  WITH CHECK (public.is_hospital_admin(hospital_id, auth.uid()));

DROP POLICY IF EXISTS "Ambulance admins manage members" ON public.holarchelp_ambulance_members;
CREATE POLICY "Ambulance admins manage members"
  ON public.holarchelp_ambulance_members
  FOR ALL TO authenticated
  USING (public.is_ambulance_admin(provider_id, auth.uid()))
  WITH CHECK (public.is_ambulance_admin(provider_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.link_pending_provider_admin_invites()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.id;
  IF _email IS NULL THEN RETURN NEW; END IF;

  UPDATE public.holarchelp_hospital_members
    SET user_id = NEW.id, accepted_at = COALESCE(accepted_at, now())
    WHERE user_id IS NULL AND lower(invited_email) = lower(_email);

  UPDATE public.holarchelp_ambulance_members
    SET user_id = NEW.id, accepted_at = COALESCE(accepted_at, now())
    WHERE user_id IS NULL AND lower(invited_email) = lower(_email);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_link_pending_provider_admin_invites ON public.profiles;
CREATE TRIGGER trg_link_pending_provider_admin_invites
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_pending_provider_admin_invites();
