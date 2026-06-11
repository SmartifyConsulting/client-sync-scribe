
-- 1. guardian-voice-clips: allow incident owner, assigned ambulance staff, destination hospital staff
CREATE POLICY "Incident owner reads own guardian voice clips"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'guardian-voice-clips'
  AND EXISTS (
    SELECT 1 FROM public.holarchelp_voice_notes vn
    JOIN public.holarchelp_incidents i ON i.id = vn.incident_id
    WHERE vn.audio_url LIKE '%' || storage.objects.name
      AND (i.user_id = auth.uid() OR i.triggered_by_user_id = auth.uid())
  )
);

CREATE POLICY "Assigned ambulance staff read guardian voice clips"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'guardian-voice-clips'
  AND EXISTS (
    SELECT 1 FROM public.holarchelp_voice_notes vn
    JOIN public.holarchelp_incidents i ON i.id = vn.incident_id
    WHERE vn.audio_url LIKE '%' || storage.objects.name
      AND i.assigned_provider_id IS NOT NULL
      AND public.is_ambulance_staff(i.assigned_provider_id, auth.uid())
  )
);

CREATE POLICY "Destination hospital staff read guardian voice clips"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'guardian-voice-clips'
  AND EXISTS (
    SELECT 1 FROM public.holarchelp_voice_notes vn
    JOIN public.holarchelp_incidents i ON i.id = vn.incident_id
    WHERE vn.audio_url LIKE '%' || storage.objects.name
      AND i.destination_hospital_id IS NOT NULL
      AND public.is_hospital_staff(i.destination_hospital_id, auth.uid())
  )
);

-- 2. holarchelp_incident_offers: providers can UPDATE their own offer's response
CREATE POLICY "Provider responds to own offers"
ON public.holarchelp_incident_offers FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.holarchelp_ambulance_providers p
          WHERE p.id = holarchelp_incident_offers.provider_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_members m
             WHERE m.provider_id = holarchelp_incident_offers.provider_id AND m.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.holarchelp_ambulance_providers p
          WHERE p.id = holarchelp_incident_offers.provider_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_members m
             WHERE m.provider_id = holarchelp_incident_offers.provider_id AND m.user_id = auth.uid())
);

-- 3. holarchelp_locations: assigned ambulance staff can SELECT
CREATE POLICY "Assigned ambulance staff read incident locations"
ON public.holarchelp_locations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.holarchelp_incidents i
    WHERE i.id = holarchelp_locations.incident_id
      AND i.assigned_provider_id IS NOT NULL
      AND public.is_ambulance_staff(i.assigned_provider_id, auth.uid())
  )
);

-- 4. holarchelp_provider_locations: hospital staff INSERT
CREATE POLICY "Hospital staff insert own location"
ON public.holarchelp_provider_locations FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.holarchelp_incidents i
    WHERE i.id = holarchelp_provider_locations.incident_id
      AND i.destination_hospital_id IS NOT NULL
      AND public.is_hospital_staff(i.destination_hospital_id, auth.uid())
  )
);

CREATE POLICY "Hospital staff update own location"
ON public.holarchelp_provider_locations FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.holarchelp_incidents i
    WHERE i.id = holarchelp_provider_locations.incident_id
      AND i.destination_hospital_id IS NOT NULL
      AND public.is_hospital_staff(i.destination_hospital_id, auth.uid())
  )
);

-- 5. patient_invitations: patient can read invitation sent to their email
CREATE POLICY "Patients view invitations sent to their email"
ON public.patient_invitations FOR SELECT TO authenticated
USING (
  lower(patient_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- 6. auth_recovery_attempts / auth_recovery_audit: confirm service-role-only, revoke broad grants
REVOKE ALL ON public.auth_recovery_attempts FROM anon, authenticated;
REVOKE ALL ON public.auth_recovery_audit FROM anon, authenticated;
GRANT ALL ON public.auth_recovery_attempts TO service_role;
GRANT ALL ON public.auth_recovery_audit TO service_role;
