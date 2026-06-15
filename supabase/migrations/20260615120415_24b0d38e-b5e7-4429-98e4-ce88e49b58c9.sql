
-- 1) Hospital nurses: restrict broad SELECT to admins/owners only
DROP POLICY IF EXISTS "Hospital staff manage their nurses" ON public.hospital_nurses;

CREATE POLICY "Hospital admins read nurses"
  ON public.hospital_nurses
  FOR SELECT
  TO authenticated
  USING (
    public.is_hospital_admin(hospital_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.user_role)
  );

CREATE POLICY "Hospital admins insert nurses"
  ON public.hospital_nurses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_hospital_admin(hospital_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.user_role)
  );

CREATE POLICY "Hospital admins update nurses"
  ON public.hospital_nurses
  FOR UPDATE
  TO authenticated
  USING (
    public.is_hospital_admin(hospital_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.user_role)
  )
  WITH CHECK (
    public.is_hospital_admin(hospital_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.user_role)
  );

CREATE POLICY "Hospital admins delete nurses"
  ON public.hospital_nurses
  FOR DELETE
  TO authenticated
  USING (
    public.is_hospital_admin(hospital_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.user_role)
  );

-- 2) Session audio: allow treating doctor (sessions.user_id) to read the audio file
CREATE POLICY "Treating doctor can read session audio"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'session-audio'
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.user_id = auth.uid()
        AND s.audio_url IS NOT NULL
        AND s.audio_url LIKE '%' || storage.objects.name
    )
  );
