-- Allow doctors with doctor_patient_access to update patients they have access to
-- This fixes the "failed to update patient" error when doctors change fields like organ_donor

CREATE POLICY "Doctors can update patients they have access to"
ON public.patients
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access dpa
    WHERE dpa.patient_id = patients.id
      AND dpa.doctor_id = auth.uid()
      AND dpa.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access dpa
    WHERE dpa.patient_id = patients.id
      AND dpa.doctor_id = auth.uid()
      AND dpa.is_active = true
  )
);

-- Allow patients to update their own patient record via patient_user_id
CREATE POLICY "Patients can update their own patient profile"
ON public.patients
FOR UPDATE
TO authenticated
USING (auth.uid() = patient_user_id)
WITH CHECK (auth.uid() = patient_user_id);
