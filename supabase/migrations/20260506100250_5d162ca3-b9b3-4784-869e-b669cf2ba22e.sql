-- Rename moola → vula across schema (data preserved)

-- 1. Rename tables
ALTER TABLE public.moola_partner_apps RENAME TO vula_partner_apps;
ALTER TABLE public.moola_transfers RENAME TO vula_transfers;
ALTER TABLE public.moola_adherence_configs RENAME TO vula_adherence_configs;

-- 2. Rename columns
ALTER TABLE public.doctor_rewards RENAME COLUMN moolas_count TO vulas_count;
ALTER TABLE public.emoticon_messages RENAME COLUMN moolas_awarded TO vulas_awarded;
ALTER TABLE public.todos RENAME COLUMN moolas_reward TO vulas_reward;

-- 3. Rename indexes/constraints embedding "moola"
ALTER INDEX IF EXISTS moola_partner_apps_partner_code_key RENAME TO vula_partner_apps_partner_code_key;
ALTER TABLE public.vula_transfers RENAME CONSTRAINT moola_transfers_partner_app_id_fkey TO vula_transfers_partner_app_id_fkey;

-- 4. Rename trigger on renamed table
ALTER TRIGGER update_moola_adherence_configs_updated_at ON public.vula_adherence_configs
  RENAME TO update_vula_adherence_configs_updated_at;

-- 5. Recreate functions referencing renamed column
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

  SELECT COALESCE(SUM(vulas_count),0) INTO _month_total
  FROM public.doctor_rewards
  WHERE doctor_id = _doctor
    AND reward_type = 'patient_checkin'
    AND reference_id = _patient_user_id
    AND awarded_at >= date_trunc('month', now());

  IF _month_total + 30 <= 60 THEN
    INSERT INTO public.doctor_rewards(doctor_id, reward_type, description, vulas_count, reference_id)
    VALUES (_doctor, 'patient_checkin', 'Patient check-in', 30, _patient_user_id);
    RETURN jsonb_build_object('awarded', true, 'total', _month_total + 30);
  END IF;

  RETURN jsonb_build_object('awarded', false, 'reason', 'monthly_cap', 'total', _month_total);
END;
$$;

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

  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_rewards
    WHERE doctor_id = NEW.doctor_id
      AND reward_type = 'patient_onboarded'
      AND reference_id = NEW.patient_user_id
  ) THEN
    INSERT INTO public.doctor_rewards(doctor_id, reward_type, description, vulas_count, reference_id)
    VALUES (NEW.doctor_id, 'patient_onboarded', 'New patient onboarded', 30, NEW.patient_user_id);
  END IF;

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