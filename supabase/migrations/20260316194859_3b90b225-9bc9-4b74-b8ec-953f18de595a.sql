-- Allow patients to view documents linked to their patient record
CREATE POLICY "Patients can view documents for their patient record"
ON public.documents FOR SELECT TO authenticated
USING (patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid()));

-- Allow patients to view their round table notes
CREATE POLICY "Patients can view their round table notes"
ON public.round_table_notes FOR SELECT TO authenticated
USING (patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid()));