CREATE POLICY "Users can update their media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING  (bucket_id = 'patient-media')
  WITH CHECK (bucket_id = 'patient-media');

CREATE POLICY "Users can read their media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'patient-media');