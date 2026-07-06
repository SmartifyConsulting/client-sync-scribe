
CREATE OR REPLACE FUNCTION public.provider_has_offer_on_incident(_incident_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.holarchelp_incident_offers o
    WHERE o.incident_id = _incident_id
      AND (
        public.is_ambulance_staff(o.provider_id, _user_id)
        OR public.is_hospital_staff(o.provider_id, _user_id)
      )
  );
$$;

DROP POLICY IF EXISTS "Provider staff read offered incidents" ON public.holarchelp_incidents;
CREATE POLICY "Provider staff read offered incidents"
  ON public.holarchelp_incidents
  FOR SELECT
  USING (public.provider_has_offer_on_incident(id, auth.uid()));

DROP POLICY IF EXISTS "Assigned provider staff read incident" ON public.holarchelp_incidents;
CREATE POLICY "Assigned provider staff read incident"
  ON public.holarchelp_incidents
  FOR SELECT
  USING (
    assigned_provider_id IS NOT NULL
    AND (
      public.is_ambulance_staff(assigned_provider_id, auth.uid())
      OR public.is_hospital_staff(assigned_provider_id, auth.uid())
    )
  );
