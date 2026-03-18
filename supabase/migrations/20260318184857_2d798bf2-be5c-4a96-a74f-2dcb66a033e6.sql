ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_id uuid DEFAULT NULL;

ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS document_id uuid DEFAULT NULL;

CREATE POLICY "Patients can update their documents send status"
ON public.documents FOR UPDATE TO authenticated
USING (patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid()))
WITH CHECK (patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid()));