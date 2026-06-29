
ALTER TABLE public.holarchelp_provider_locations
  ADD COLUMN IF NOT EXISTS simulated boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Only admins may write simulated locations" ON public.holarchelp_provider_locations;

CREATE POLICY "Only admins may write simulated locations"
  ON public.holarchelp_provider_locations
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    simulated = false
    OR public.has_role(auth.uid(), 'admin'::public.user_role)
  );
