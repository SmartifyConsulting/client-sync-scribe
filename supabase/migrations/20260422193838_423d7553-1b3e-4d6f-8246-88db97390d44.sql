DROP POLICY IF EXISTS "Doctors can insert admissions for their patients" ON public.hospital_admissions;

CREATE POLICY "Authorized users can insert admissions"
ON public.hospital_admissions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = doctor_id
  AND (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = hospital_admissions.patient_id
        AND p.patient_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = hospital_admissions.patient_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
      WHERE p.id = hospital_admissions.patient_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
    )
  )
);