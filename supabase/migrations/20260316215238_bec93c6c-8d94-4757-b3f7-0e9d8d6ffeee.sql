CREATE POLICY "Patients can update their own patient record"
ON public.patients FOR UPDATE TO authenticated
USING (patient_user_id = auth.uid())
WITH CHECK (patient_user_id = auth.uid());