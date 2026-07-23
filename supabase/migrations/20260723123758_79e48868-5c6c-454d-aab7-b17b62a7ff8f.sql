
DROP POLICY IF EXISTS "Doctors can view requests for them" ON public.doctor_access_requests;
DROP POLICY IF EXISTS "Doctors can update requests for them" ON public.doctor_access_requests;

CREATE POLICY "Doctors can view requests for them"
ON public.doctor_access_requests
FOR SELECT
USING (
  public.has_role(auth.uid(), 'doctor'::public.user_role)
  AND doctor_practice_number IS NOT NULL
  AND doctor_registration_number IS NOT NULL
  AND length(btrim(doctor_practice_number)) > 0
  AND length(btrim(doctor_registration_number)) > 0
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.practice_number = doctor_access_requests.doctor_practice_number
      AND p.doctor_number = doctor_access_requests.doctor_registration_number
  )
);

CREATE POLICY "Doctors can update requests for them"
ON public.doctor_access_requests
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'doctor'::public.user_role)
  AND doctor_practice_number IS NOT NULL
  AND doctor_registration_number IS NOT NULL
  AND length(btrim(doctor_practice_number)) > 0
  AND length(btrim(doctor_registration_number)) > 0
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.practice_number = doctor_access_requests.doctor_practice_number
      AND p.doctor_number = doctor_access_requests.doctor_registration_number
  )
);

CREATE OR REPLACE FUNCTION public.prevent_doctor_credential_self_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.id = auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.user_role)
  THEN
    IF COALESCE(NEW.practice_number, '') IS DISTINCT FROM COALESCE(OLD.practice_number, '')
       AND OLD.practice_number IS NOT NULL
       AND length(btrim(OLD.practice_number)) > 0
    THEN
      RAISE EXCEPTION 'practice_number is verified and cannot be changed by the account owner';
    END IF;
    IF COALESCE(NEW.doctor_number, '') IS DISTINCT FROM COALESCE(OLD.doctor_number, '')
       AND OLD.doctor_number IS NOT NULL
       AND length(btrim(OLD.doctor_number)) > 0
    THEN
      RAISE EXCEPTION 'doctor_number is verified and cannot be changed by the account owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_doctor_credential_self_edit ON public.profiles;
CREATE TRIGGER profiles_prevent_doctor_credential_self_edit
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_doctor_credential_self_edit();

DROP POLICY IF EXISTS "Authorized users can insert admissions" ON public.hospital_admissions;

CREATE POLICY "Authorized users can insert admissions"
ON public.hospital_admissions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = hospital_admissions.patient_id
        AND (p.patient_user_id = auth.uid() OR p.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.patients p
      JOIN public.doctor_patient_access dpa
        ON dpa.patient_user_id = p.patient_user_id
      WHERE p.id = hospital_admissions.patient_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
    )
    OR (
      hospital_provider_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.holarchelp_hospital_members m
        WHERE m.hospital_id = hospital_admissions.hospital_provider_id
          AND m.user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1
        FROM public.patients p
        JOIN public.doctor_patient_access dpa
          ON dpa.patient_user_id = p.patient_user_id
        JOIN public.hospital_doctor_affiliations hda
          ON hda.doctor_id = dpa.doctor_id
        WHERE p.id = hospital_admissions.patient_id
          AND dpa.doctor_id = auth.uid()
          AND dpa.is_active = true
          AND hda.hospital_id = hospital_admissions.hospital_provider_id
      )
    )
  )
);
