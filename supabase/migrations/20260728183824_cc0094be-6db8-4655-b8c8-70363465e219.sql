
-- Helper: only return the caller's email when it has been verified
CREATE OR REPLACE FUNCTION public.current_verified_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT lower(u.email::text)
  FROM auth.users u
  WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.current_verified_email() FROM public;
GRANT EXECUTE ON FUNCTION public.current_verified_email() TO authenticated, service_role;

-- Helper: extract the storage object path from a stored audio url/path
CREATE OR REPLACE FUNCTION public.storage_object_path(_url text, _bucket text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _url IS NULL THEN NULL
    WHEN position('/' || _bucket || '/' in _url) > 0
      THEN split_part(_url, '/' || _bucket || '/', 2)
    ELSE _url
  END
$$;

GRANT EXECUTE ON FUNCTION public.storage_object_path(text, text) TO authenticated, anon, service_role;

-- 1. patient_invitations: require verified email
DROP POLICY IF EXISTS "Patients view invitations sent to their email" ON public.patient_invitations;
CREATE POLICY "Patients view invitations sent to their email"
ON public.patient_invitations
FOR SELECT
TO authenticated
USING (
  public.current_verified_email() IS NOT NULL
  AND lower(patient_email) = public.current_verified_email()
);

-- 2. practice_invitations: require verified email
DROP POLICY IF EXISTS "Invitee can view own invitations by email" ON public.practice_invitations;
CREATE POLICY "Invitee can view own invitations by email"
ON public.practice_invitations
FOR SELECT
TO authenticated
USING (
  public.current_verified_email() IS NOT NULL
  AND lower(invited_email) = public.current_verified_email()
);

DROP POLICY IF EXISTS "Invitee can update own invitation status" ON public.practice_invitations;
CREATE POLICY "Invitee can update own invitation status"
ON public.practice_invitations
FOR UPDATE
TO authenticated
USING (
  public.current_verified_email() IS NOT NULL
  AND lower(invited_email) = public.current_verified_email()
)
WITH CHECK (
  public.current_verified_email() IS NOT NULL
  AND lower(invited_email) = public.current_verified_email()
);

-- 3. provider locations: staff access only while incident is active
DROP POLICY IF EXISTS "Incident participants can view locations" ON public.holarchelp_provider_locations;
CREATE POLICY "Incident participants can view locations"
ON public.holarchelp_provider_locations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR EXISTS (
    SELECT 1 FROM public.holarchelp_incidents i
    WHERE i.id = holarchelp_provider_locations.incident_id
      AND (
        i.user_id = auth.uid()
        OR i.triggered_by_user_id = auth.uid()
        OR (
          i.status NOT IN ('completed', 'cancelled', 'at_hospital')
          AND (
            (i.assigned_provider_id IS NOT NULL AND is_ambulance_staff(i.assigned_provider_id, auth.uid()))
            OR (i.destination_hospital_id IS NOT NULL AND is_hospital_staff(i.destination_hospital_id, auth.uid()))
          )
        )
      )
  )
);

-- 4. storage: exact path matching instead of LIKE
DROP POLICY IF EXISTS "Patients can read own session audio" ON storage.objects;
CREATE POLICY "Patients can read own session audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'session-audio'
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.patients p ON p.id = s.patient_id
    WHERE p.patient_user_id = auth.uid()
      AND s.audio_url IS NOT NULL
      AND public.storage_object_path(s.audio_url, 'session-audio') = objects.name
  )
);

DROP POLICY IF EXISTS "Treating doctor can read session audio" ON storage.objects;
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
      AND public.storage_object_path(s.audio_url, 'session-audio') = objects.name
  )
);

DROP POLICY IF EXISTS "Assigned ambulance staff read guardian voice clips" ON storage.objects;
CREATE POLICY "Assigned ambulance staff read guardian voice clips"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'guardian-voice-clips'
  AND EXISTS (
    SELECT 1 FROM public.holarchelp_voice_notes vn
    JOIN public.holarchelp_incidents i ON i.id = vn.incident_id
    WHERE public.storage_object_path(vn.audio_url, 'guardian-voice-clips') = objects.name
      AND i.assigned_provider_id IS NOT NULL
      AND is_ambulance_staff(i.assigned_provider_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Destination hospital staff read guardian voice clips" ON storage.objects;
CREATE POLICY "Destination hospital staff read guardian voice clips"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'guardian-voice-clips'
  AND EXISTS (
    SELECT 1 FROM public.holarchelp_voice_notes vn
    JOIN public.holarchelp_incidents i ON i.id = vn.incident_id
    WHERE public.storage_object_path(vn.audio_url, 'guardian-voice-clips') = objects.name
      AND i.destination_hospital_id IS NOT NULL
      AND is_hospital_staff(i.destination_hospital_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Incident owner reads own guardian voice clips" ON storage.objects;
CREATE POLICY "Incident owner reads own guardian voice clips"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'guardian-voice-clips'
  AND EXISTS (
    SELECT 1 FROM public.holarchelp_voice_notes vn
    JOIN public.holarchelp_incidents i ON i.id = vn.incident_id
    WHERE public.storage_object_path(vn.audio_url, 'guardian-voice-clips') = objects.name
      AND (i.user_id = auth.uid() OR i.triggered_by_user_id = auth.uid())
  )
);
