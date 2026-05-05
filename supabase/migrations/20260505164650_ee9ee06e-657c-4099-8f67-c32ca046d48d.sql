-- 1. Extend user_role enum with blood_bank
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'blood_bank';

-- 2. Doctor check-ins
CREATE TABLE IF NOT EXISTS public.doctor_patient_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_user_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_patient_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctor can view own check-ins"
ON public.doctor_patient_checkins FOR SELECT USING (doctor_id = auth.uid());
CREATE POLICY "Patient can view own check-ins"
ON public.doctor_patient_checkins FOR SELECT USING (patient_user_id = auth.uid());

-- 3. Award fn: 30 Vulas / check-in, max 60/month per (doctor, patient)
CREATE OR REPLACE FUNCTION public.award_doctor_checkin(_patient_user_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _doctor uuid := auth.uid();
  _has_access boolean;
  _month_total integer;
BEGIN
  IF _doctor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.doctor_patient_access
    WHERE doctor_id = _doctor AND patient_user_id = _patient_user_id AND is_active = true
  ) INTO _has_access;
  IF NOT _has_access THEN RAISE EXCEPTION 'No active access to this patient'; END IF;

  INSERT INTO public.doctor_patient_checkins(doctor_id, patient_user_id, note)
  VALUES (_doctor, _patient_user_id, _note);

  SELECT COALESCE(SUM(moolas_count),0) INTO _month_total
  FROM public.doctor_rewards
  WHERE doctor_id = _doctor
    AND reward_type = 'patient_checkin'
    AND reference_id = _patient_user_id
    AND awarded_at >= date_trunc('month', now());

  IF _month_total + 30 <= 60 THEN
    INSERT INTO public.doctor_rewards(doctor_id, reward_type, description, moolas_count, reference_id)
    VALUES (_doctor, 'patient_checkin', 'Patient check-in', 30, _patient_user_id);
    RETURN jsonb_build_object('awarded', true, 'total', _month_total + 30);
  END IF;

  RETURN jsonb_build_object('awarded', false, 'reason', 'monthly_cap', 'total', _month_total);
END;
$$;

-- 4. Onboarding rewards: 30 Vulas to patient + 30 Vulas to doctor (deduped)
CREATE OR REPLACE FUNCTION public.award_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient_id uuid;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN RETURN NEW; END IF;

  -- Doctor reward
  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_rewards
    WHERE doctor_id = NEW.doctor_id
      AND reward_type = 'patient_onboarded'
      AND reference_id = NEW.patient_user_id
  ) THEN
    INSERT INTO public.doctor_rewards(doctor_id, reward_type, description, moolas_count, reference_id)
    VALUES (NEW.doctor_id, 'patient_onboarded', 'New patient onboarded', 30, NEW.patient_user_id);
  END IF;

  -- Find patient record id for this user
  SELECT id INTO _patient_id FROM public.patients
  WHERE patient_user_id = NEW.patient_user_id
  ORDER BY created_at LIMIT 1;

  IF _patient_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.patient_rewards
    WHERE patient_id = _patient_id
      AND reward_type = 'doctor_onboarded'
      AND awarded_by = NEW.doctor_id
  ) THEN
    INSERT INTO public.patient_rewards(patient_id, reward_type, lollipops_count, awarded_by, visit_category)
    VALUES (_patient_id, 'doctor_onboarded', 30, NEW.doctor_id, 'onboarding');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_onboarding ON public.doctor_patient_access;
CREATE TRIGGER trg_award_onboarding
AFTER INSERT OR UPDATE OF is_active ON public.doctor_patient_access
FOR EACH ROW EXECUTE FUNCTION public.award_onboarding();

-- 5. Blood banks
CREATE TABLE IF NOT EXISTS public.blood_bank_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  registration_number text,
  address text,
  city text,
  state text,
  country text,
  latitude double precision,
  longitude double precision,
  contact_phone text,
  contact_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_bank_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved blood banks"
ON public.blood_bank_providers FOR SELECT
USING (status = 'approved' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can read own"
ON public.blood_bank_providers FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert own"
ON public.blood_bank_providers FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own"
ON public.blood_bank_providers FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Admins can read all blood banks"
ON public.blood_bank_providers FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can update blood banks"
ON public.blood_bank_providers FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE TRIGGER update_blood_bank_providers_updated_at
BEFORE UPDATE ON public.blood_bank_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.holarchelp_approve_blood_bank(_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;
  UPDATE public.blood_bank_providers SET status='approved', approved_at=now()
    WHERE id = _provider_id RETURNING owner_id INTO _owner;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_owner, 'blood_bank'::public.user_role) ON CONFLICT DO NOTHING;
END $$;

-- 6. Blood donations
CREATE TABLE IF NOT EXISTS public.blood_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  blood_bank_id uuid NOT NULL REFERENCES public.blood_bank_providers(id) ON DELETE RESTRICT,
  donated_at date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient can insert own donations"
ON public.blood_donations FOR INSERT WITH CHECK (patient_user_id = auth.uid());
CREATE POLICY "Patient can view own donations"
ON public.blood_donations FOR SELECT USING (patient_user_id = auth.uid());
CREATE POLICY "Blood bank can view donations to them"
ON public.blood_donations FOR SELECT
USING (EXISTS (SELECT 1 FROM public.blood_bank_providers b
               WHERE b.id = blood_bank_id AND b.owner_id = auth.uid()));
CREATE POLICY "Blood bank can update donations to them"
ON public.blood_donations FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.blood_bank_providers b
               WHERE b.id = blood_bank_id AND b.owner_id = auth.uid()));

CREATE TRIGGER update_blood_donations_updated_at
BEFORE UPDATE ON public.blood_donations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.approve_blood_donation(_donation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.blood_donations;
  _patient_id uuid;
  _is_owner boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _row FROM public.blood_donations WHERE id = _donation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Donation not found'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.blood_bank_providers
                 WHERE id = _row.blood_bank_id AND owner_id = auth.uid())
  INTO _is_owner;
  IF NOT _is_owner THEN RAISE EXCEPTION 'Only the blood bank owner can approve'; END IF;

  UPDATE public.blood_donations
    SET status='approved', approved_by=auth.uid(), approved_at=now()
    WHERE id = _donation_id;

  IF NOT _row.rewarded THEN
    SELECT id INTO _patient_id FROM public.patients
    WHERE patient_user_id = _row.patient_user_id
    ORDER BY created_at LIMIT 1;

    IF _patient_id IS NOT NULL THEN
      INSERT INTO public.patient_rewards(patient_id, reward_type, lollipops_count, awarded_by, visit_category)
      VALUES (_patient_id, 'blood_donation', 100, auth.uid(), 'donation');
      UPDATE public.blood_donations SET rewarded = true WHERE id = _donation_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('approved', true);
END;
$$;

-- 7. Public/private ownership flag for hospitals + ambulance providers
ALTER TABLE public.holarchelp_hospitals
  ADD COLUMN IF NOT EXISTS ownership text NOT NULL DEFAULT 'private'
  CHECK (ownership IN ('public','private'));

ALTER TABLE public.holarchelp_ambulance_providers
  ADD COLUMN IF NOT EXISTS ownership text NOT NULL DEFAULT 'private'
  CHECK (ownership IN ('public','private'));

-- 8. Extend search_providers RPC to include ownership
DROP FUNCTION IF EXISTS public.search_providers(text, text, text);
CREATE OR REPLACE FUNCTION public.search_providers(_name text DEFAULT NULL, _specialty text DEFAULT NULL, _language text DEFAULT NULL)
RETURNS TABLE(id uuid, kind text, full_name text, specialty text, address text, phone text, avatar_url text, registration text, about_me text, preferred_language text, stars numeric, ownership text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, 'doctor'::text,
         p.full_name, p.specialty, p.practice_address, p.mobile_number, p.avatar_url,
         COALESCE(p.practice_number, p.doctor_number),
         p.about_me, p.preferred_language,
         (3
          + CASE WHEN p.specialty IS NOT NULL AND p.specialty <> '' THEN 1 ELSE 0 END
          + CASE WHEN p.practice_number IS NOT NULL AND p.doctor_number IS NOT NULL THEN 1 ELSE 0 END
         )::numeric AS stars,
         NULL::text AS ownership
  FROM public.profiles p
  WHERE p.role = 'doctor'::user_role
    AND auth.uid() IS NOT NULL
    AND (_name IS NULL OR _name = '' OR p.full_name ILIKE '%'||_name||'%' OR p.practice_number = _name OR p.doctor_number = _name)
    AND (_specialty IS NULL OR _specialty = '' OR p.specialty ILIKE '%'||_specialty||'%')
    AND (_language IS NULL OR _language = '' OR p.preferred_language = _language)
  UNION ALL
  SELECT h.id, 'hospital'::text,
         h.name, NULL, COALESCE(h.address,'') || CASE WHEN h.city IS NOT NULL THEN ', '||h.city ELSE '' END,
         h.contact_phone, NULL, h.registration_number,
         NULL, NULL, 4::numeric, h.ownership
  FROM public.holarchelp_hospitals h
  WHERE h.status = 'approved' AND auth.uid() IS NOT NULL
    AND (_name IS NULL OR _name = '' OR h.name ILIKE '%'||_name||'%')
    AND (_specialty IS NULL OR _specialty = '')
    AND (_language IS NULL OR _language = '')
  UNION ALL
  SELECT a.id, 'ambulance'::text,
         a.company_name, NULL, COALESCE(a.base_address,'') || CASE WHEN a.city IS NOT NULL THEN ', '||a.city ELSE '' END,
         a.contact_phone, NULL, a.registration_number,
         NULL, NULL, 4::numeric, a.ownership
  FROM public.holarchelp_ambulance_providers a
  WHERE a.status = 'approved' AND auth.uid() IS NOT NULL
    AND (_name IS NULL OR _name = '' OR a.company_name ILIKE '%'||_name||'%')
    AND (_specialty IS NULL OR _specialty = '')
    AND (_language IS NULL OR _language = '')
  LIMIT 100;
$$;