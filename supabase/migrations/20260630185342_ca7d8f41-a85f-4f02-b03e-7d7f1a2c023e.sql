DROP POLICY IF EXISTS "Provider members view stops" ON public.holarchelp_telematics_stops;
CREATE POLICY "Management view stops" ON public.holarchelp_telematics_stops
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM holarchelp_ambulance_providers p WHERE p.id = holarchelp_telematics_stops.provider_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM holarchelp_ambulance_members m WHERE m.provider_id = holarchelp_telematics_stops.provider_id AND m.user_id = auth.uid() AND m.role IN ('admin','owner','dispatcher','manager'))
  OR has_role(auth.uid(), 'admin'::user_role)
);