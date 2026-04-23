-- Allow doctors with active access (or who own the patient record) to SELECT patient-uploaded documents
CREATE POLICY "Doctors with access can view patient documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
  patient_id IN (
    SELECT p.id
    FROM public.patients p
    JOIN public.doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
    WHERE dpa.doctor_id = auth.uid() AND dpa.is_active = true
  )
  OR patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

-- Allow doctors with active access (or who own the patient record) to DELETE patient-uploaded documents
CREATE POLICY "Doctors with access can delete patient documents"
ON public.documents
FOR DELETE
TO authenticated
USING (
  patient_id IN (
    SELECT p.id
    FROM public.patients p
    JOIN public.doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
    WHERE dpa.doctor_id = auth.uid() AND dpa.is_active = true
  )
  OR patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);