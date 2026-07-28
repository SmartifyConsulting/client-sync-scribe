CREATE POLICY "Users can read their own email attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'email-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own email attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'email-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );