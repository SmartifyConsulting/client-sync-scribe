CREATE POLICY "Patients can insert documents for their own record"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);