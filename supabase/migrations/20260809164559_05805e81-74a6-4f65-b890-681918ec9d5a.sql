-- Read-only historical access for previously connected practitioners.
CREATE OR REPLACE FUNCTION public.doctor_had_access_at(_patient_id uuid, _created_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patients p
    JOIN public.doctor_patient_access dpa
      ON dpa.patient_user_id = p.patient_user_id
    WHERE p.id = _patient_id
      AND dpa.doctor_id = auth.uid()
      AND (
        dpa.is_active = true
        OR _created_at <= COALESCE(dpa.revoked_at, now())
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.doctor_had_access_at(uuid, timestamptz) TO authenticated;

CREATE POLICY "Previously connected doctors can view historic documents"
ON public.documents FOR SELECT TO authenticated
USING (patient_id IS NOT NULL AND public.doctor_had_access_at(patient_id, created_at));

CREATE POLICY "Previously connected doctors can view historic sessions"
ON public.sessions FOR SELECT TO authenticated
USING (patient_id IS NOT NULL AND public.doctor_had_access_at(patient_id, created_at));

CREATE POLICY "Previously connected doctors can view historic prescriptions"
ON public.prescriptions FOR SELECT TO authenticated
USING (patient_id IS NOT NULL AND public.doctor_had_access_at(patient_id, created_at));

CREATE POLICY "Previously connected doctors can view historic admissions"
ON public.hospital_admissions FOR SELECT TO authenticated
USING (patient_id IS NOT NULL AND public.doctor_had_access_at(patient_id, created_at));

CREATE POLICY "Previously connected doctors can view historic round table notes"
ON public.round_table_notes FOR SELECT TO authenticated
USING (patient_id IS NOT NULL AND public.doctor_had_access_at(patient_id, created_at));

-- Only practitioners may record weigh-ins (patients cannot self-award Vulas).
DROP POLICY IF EXISTS "Doctors can record weigh-ins" ON public.patient_weigh_ins;
CREATE POLICY "Only practitioners can record weigh-ins"
ON public.patient_weigh_ins FOR INSERT TO authenticated
WITH CHECK (
  recorded_by = auth.uid()
  AND (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse'))
);