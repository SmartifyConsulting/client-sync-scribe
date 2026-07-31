-- 1) Config tables: restrict reads to authenticated users only
DROP POLICY IF EXISTS "Anyone can view pricing" ON public.pricing_config;
DROP POLICY IF EXISTS "Authenticated users can view pricing" ON public.pricing_config;
CREATE POLICY "Authenticated users can view pricing" ON public.pricing_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view gamification config" ON public.gamification_config;
CREATE POLICY "Authenticated users can view gamification config" ON public.gamification_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view streak config" ON public.streak_config;
CREATE POLICY "Authenticated users can view streak config" ON public.streak_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view adherence configs" ON public.vula_adherence_configs;
CREATE POLICY "Authenticated users can view adherence configs" ON public.vula_adherence_configs
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.pricing_config FROM anon;
REVOKE SELECT ON public.gamification_config FROM anon;
REVOKE SELECT ON public.streak_config FROM anon;
REVOKE SELECT ON public.vula_adherence_configs FROM anon;
REVOKE SELECT ON public.app_modules FROM anon;
REVOKE SELECT ON public.holarchelp_voice_clip_settings FROM anon;
REVOKE SELECT ON public.approved_daily_medications FROM anon;

-- 2) emoticon_messages reply policy: correlate the parent with the new row's reply_to_id
DROP POLICY IF EXISTS "Users can reply to their check-ins" ON public.emoticon_messages;
CREATE POLICY "Users can reply to their check-ins" ON public.emoticon_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND reply_to_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.emoticon_messages parent
      WHERE parent.id = emoticon_messages.reply_to_id
        AND parent.recipient_id = auth.uid()
        AND parent.sender_id = emoticon_messages.recipient_id
        AND parent.patient_id = emoticon_messages.patient_id
    )
  );

-- 3) Storage: provider licence uploads strictly bound to uploader's own provider row
DROP POLICY IF EXISTS "provider_licenses_insert_own" ON storage.objects;
CREATE POLICY "provider_licenses_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'provider-licenses'
    AND (storage.foldername(name))[1] = 'pending'
    AND (storage.foldername(name))[2] = (auth.uid())::text
    AND public.user_owns_provider_license_path(name)
  );