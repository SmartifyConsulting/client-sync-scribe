CREATE POLICY "Doctors can insert access grants"
ON public.doctor_patient_access FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = doctor_id);