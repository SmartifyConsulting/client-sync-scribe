
-- Restrict approved-provider listings to authenticated users only (hide contact PII from anon)
DROP POLICY IF EXISTS "Public can view approved active hospitals" ON public.holarchelp_hospitals;
CREATE POLICY "Authenticated can view approved active hospitals"
  ON public.holarchelp_hospitals
  FOR SELECT
  TO authenticated
  USING (status = 'approved'::holarchelp_provider_status
         AND subscription_status = 'active'::holarchelp_subscription_status);

DROP POLICY IF EXISTS "Public can view approved active ambulances" ON public.holarchelp_ambulance_providers;
CREATE POLICY "Authenticated can view approved active ambulances"
  ON public.holarchelp_ambulance_providers
  FOR SELECT
  TO authenticated
  USING (status = 'approved'::holarchelp_provider_status
         AND subscription_status = 'active'::holarchelp_subscription_status);
