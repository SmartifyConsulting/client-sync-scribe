-- Stores the front/back ID images Didit captures during identity
-- verification, once per client, so FICA doesn't need to re-request them.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS id_document_front_path text,
  ADD COLUMN IF NOT EXISTS id_document_back_path text,
  ADD COLUMN IF NOT EXISTS id_document_captured_at timestamptz;

INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Only the client's own Wealth Manager (patients.user_id) may read these.
CREATE POLICY "Broker reads their clients' identity documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'identity-documents'
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id::text = (storage.foldername(name))[1] AND p.user_id = auth.uid()
    )
  );
