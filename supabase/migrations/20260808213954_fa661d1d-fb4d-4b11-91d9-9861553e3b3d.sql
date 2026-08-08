ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS source_file_url text,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS record_date date,
  ADD COLUMN IF NOT EXISTS is_transcribed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  message text,
  opened_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_shares TO authenticated;
GRANT ALL ON public.document_shares TO service_role;

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sharer can manage their document shares"
ON public.document_shares FOR ALL TO authenticated
USING (shared_by = auth.uid())
WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Recipients can view shares addressed to them"
ON public.document_shares FOR SELECT TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR lower(recipient_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

CREATE INDEX IF NOT EXISTS document_shares_document_id_idx ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS document_shares_recipient_email_idx ON public.document_shares(lower(recipient_email));

CREATE TRIGGER update_document_shares_updated_at
BEFORE UPDATE ON public.document_shares
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recipients of an active share can read the shared document itself.
CREATE POLICY "Shared recipients can view the document"
ON public.documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.document_shares s
    WHERE s.document_id = documents.id
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (
        s.recipient_user_id = auth.uid()
        OR lower(s.recipient_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
      )
  )
);

-- Practice assistants may read lifestyle programme documents for practice patients.
CREATE POLICY "Assistants can view lifestyle programme documents"
ON public.documents FOR SELECT TO authenticated
USING (
  public.is_practice_assistant(auth.uid())
  AND template_name IN ('Exercise Programme', 'Eating Plan')
  AND public.assistant_of_doctor(auth.uid(), documents.user_id)
);