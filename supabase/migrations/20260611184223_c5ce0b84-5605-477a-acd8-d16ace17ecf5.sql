
-- Sanitized public views (exclude contact PII)
CREATE OR REPLACE VIEW public.holarchelp_hospitals_public AS
SELECT id, owner_id, name, registration_number, address, city, state, country,
       latitude, longitude, services, bed_capacity, icu_capacity, beds_available,
       icu_available, at_capacity, tier, status, subscription_status, approved_at,
       created_at, updated_at, dispatch_priority, accepting_patients, ownership,
       credential_score, credential_score_updated_at, er_capacity_status, er_beds_available
FROM public.holarchelp_hospitals
WHERE status = 'approved' AND subscription_status = 'active';

CREATE OR REPLACE VIEW public.holarchelp_ambulance_providers_public AS
SELECT id, owner_id, company_name, registration_number, fleet_size, base_address,
       city, state, country, latitude, longitude, status, subscription_status,
       approved_at, dispatch_priority, tier, at_capacity, sos_voice_clip_path,
       created_at, updated_at, accepting_patients, ownership, credential_score,
       credential_score_updated_at
FROM public.holarchelp_ambulance_providers
WHERE status = 'approved' AND subscription_status = 'active';

CREATE OR REPLACE VIEW public.holarchelp_pharmacies_public AS
SELECT id, owner_id, name, registration_number, address, city, country, tier,
       latitude, longitude, status, accepting_patients, dispatch_priority,
       credential_score, approved_at, created_at, updated_at
FROM public.holarchelp_pharmacies
WHERE status = 'approved';

GRANT SELECT ON public.holarchelp_hospitals_public TO authenticated, anon;
GRANT SELECT ON public.holarchelp_ambulance_providers_public TO authenticated, anon;
GRANT SELECT ON public.holarchelp_pharmacies_public TO authenticated, anon;

-- Drop the broad authenticated SELECT policies that leak contact PII
DROP POLICY IF EXISTS "Authenticated can view approved active hospitals" ON public.holarchelp_hospitals;
DROP POLICY IF EXISTS "Authenticated can view approved active ambulances" ON public.holarchelp_ambulance_providers;
DROP POLICY IF EXISTS "Authenticated can view approved pharmacies" ON public.holarchelp_pharmacies;

-- Members can still see their own org base rows (owners/admins covered by existing ALL policies)
CREATE POLICY "Members can view their hospital"
  ON public.holarchelp_hospitals
  FOR SELECT TO authenticated
  USING (public.is_hospital_staff(id, auth.uid()));

CREATE POLICY "Members can view their ambulance"
  ON public.holarchelp_ambulance_providers
  FOR SELECT TO authenticated
  USING (public.is_ambulance_staff(id, auth.uid()));
