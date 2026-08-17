-- Lets a patient add her own entries/responses into her Round Table
-- conversation, alongside the doctors' notes already supported. She can
-- only CRUD entries she authored herself; doctor notes remain untouched
-- by these new policies.

ALTER TABLE public.round_table_notes ALTER COLUMN doctor_id DROP NOT NULL;
ALTER TABLE public.round_table_notes
  ADD COLUMN IF NOT EXISTS author_type text NOT NULL DEFAULT 'doctor' CHECK (author_type IN ('doctor', 'patient')),
  ADD COLUMN IF NOT EXISTS patient_author_id uuid;

-- A patient can insert her own entry against her own patient record.
CREATE POLICY "Patients can create their own round table entries"
ON public.round_table_notes
FOR INSERT
WITH CHECK (
  author_type = 'patient'
  AND auth.uid() = patient_author_id
  AND EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = round_table_notes.patient_id
    AND p.patient_user_id = auth.uid()
  )
);

-- A patient can update/delete only entries she authored herself.
CREATE POLICY "Patients can update their own round table entries"
ON public.round_table_notes
FOR UPDATE
USING (author_type = 'patient' AND auth.uid() = patient_author_id)
WITH CHECK (author_type = 'patient' AND auth.uid() = patient_author_id);

CREATE POLICY "Patients can delete their own round table entries"
ON public.round_table_notes
FOR DELETE
USING (author_type = 'patient' AND auth.uid() = patient_author_id);
