CREATE POLICY "compliance docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='compliance-docs' AND public.can_view_patient_record(((storage.foldername(name))[1])::uuid));
CREATE POLICY "compliance docs insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='compliance-docs' AND public.can_view_patient_record(((storage.foldername(name))[1])::uuid));