-- 1. Tighten blood bank provider PII: drop broad public-read policy
DROP POLICY IF EXISTS "Public can read approved blood banks" ON public.blood_bank_providers;

-- 2. Sanitized public view (no contact_email / contact_phone)
CREATE OR REPLACE VIEW public.blood_bank_providers_public
WITH (security_invoker = true) AS
SELECT id, owner_id, name, registration_number, address, city, state, country,
       latitude, longitude, status, approved_at, created_at, updated_at
FROM public.blood_bank_providers
WHERE status = 'approved';

GRANT SELECT ON public.blood_bank_providers_public TO authenticated, anon;

-- 3. Recreate existing sanitized views with security_invoker = true so they
--    enforce the querying user's RLS instead of the (postgres) view owner's.
ALTER VIEW public.holarchelp_hospitals_public SET (security_invoker = true);
ALTER VIEW public.holarchelp_ambulance_providers_public SET (security_invoker = true);
ALTER VIEW public.holarchelp_pharmacies_public SET (security_invoker = true);