CREATE TABLE IF NOT EXISTS public.holarchelp_provider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.holarchelp_incidents(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  provider_kind text NOT NULL CHECK (provider_kind IN ('ambulance','hospital')),
  user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision,
  speed double precision,
  accuracy double precision,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (incident_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_hcp_loc_incident ON public.holarchelp_provider_locations(incident_id);
CREATE INDEX IF NOT EXISTS idx_hcp_loc_recorded ON public.holarchelp_provider_locations(recorded_at DESC);

ALTER TABLE public.holarchelp_provider_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assigned ambulance can upsert own location"
ON public.holarchelp_provider_locations
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND provider_kind = 'ambulance'
  AND public.is_ambulance_staff(provider_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.holarchelp_incidents i
    WHERE i.id = incident_id AND i.assigned_provider_id = provider_id
  )
);

CREATE POLICY "Assigned ambulance can update own location"
ON public.holarchelp_provider_locations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND public.is_ambulance_staff(provider_id, auth.uid()))
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Incident participants can view locations"
ON public.holarchelp_provider_locations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
  OR EXISTS (
    SELECT 1 FROM public.holarchelp_incidents i
    WHERE i.id = incident_id
      AND (
        i.user_id = auth.uid()
        OR i.triggered_by_user_id = auth.uid()
        OR (i.assigned_provider_id IS NOT NULL AND public.is_ambulance_staff(i.assigned_provider_id, auth.uid()))
        OR (i.destination_hospital_id IS NOT NULL AND public.is_hospital_staff(i.destination_hospital_id, auth.uid()))
      )
  )
);

CREATE TRIGGER update_hcp_loc_updated_at
BEFORE UPDATE ON public.holarchelp_provider_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.holarchelp_provider_locations;
ALTER TABLE public.holarchelp_provider_locations REPLICA IDENTITY FULL;