CREATE POLICY "Patients can create their own patient record"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (patient_user_id = auth.uid());