CREATE POLICY "Doctors with active access can view patient"
ON public.patients
FOR SELECT
USING (
  patient_user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.doctor_patient_access dpa
    WHERE dpa.patient_user_id = patients.patient_user_id
      AND dpa.doctor_id = auth.uid()
      AND dpa.is_active = true
  )
);