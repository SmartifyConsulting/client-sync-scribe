
CREATE TABLE IF NOT EXISTS public.holarchelp_telematics_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  vehicle_id uuid,
  user_id uuid NOT NULL,
  incident_id uuid,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  speed_kph numeric,
  heading numeric,
  accuracy_m numeric,
  battery numeric,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telematics_pings_provider_time
  ON public.holarchelp_telematics_pings (provider_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telematics_pings_vehicle_time
  ON public.holarchelp_telematics_pings (vehicle_id, recorded_at DESC);

GRANT SELECT, INSERT ON public.holarchelp_telematics_pings TO authenticated;
GRANT ALL ON public.holarchelp_telematics_pings TO service_role;
ALTER TABLE public.holarchelp_telematics_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers insert own pings"
  ON public.holarchelp_telematics_pings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Provider owners view pings"
  ON public.holarchelp_telematics_pings FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.holarchelp_ambulance_providers p
      WHERE p.id = holarchelp_telematics_pings.provider_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.holarchelp_ambulance_members m
      WHERE m.provider_id = holarchelp_telematics_pings.provider_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin','owner','dispatcher')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TABLE IF NOT EXISTS public.holarchelp_telematics_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  vehicle_id uuid,
  user_id uuid NOT NULL,
  incident_id uuid,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  place_label text NOT NULL DEFAULT 'unknown',
  arrived_at timestamptz NOT NULL,
  departed_at timestamptz,
  dwell_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telematics_stops_provider_time
  ON public.holarchelp_telematics_stops (provider_id, arrived_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.holarchelp_telematics_stops TO authenticated;
GRANT ALL ON public.holarchelp_telematics_stops TO service_role;
ALTER TABLE public.holarchelp_telematics_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider members view stops"
  ON public.holarchelp_telematics_stops FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_providers p
               WHERE p.id = holarchelp_telematics_stops.provider_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_members m
               WHERE m.provider_id = holarchelp_telematics_stops.provider_id AND m.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Drivers insert own stops"
  ON public.holarchelp_telematics_stops FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.holarchelp_telematics_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  vehicle_id uuid,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  start_lat double precision,
  start_lng double precision,
  end_lat double precision,
  end_lng double precision,
  distance_m numeric DEFAULT 0,
  max_speed_kph numeric,
  avg_speed_kph numeric,
  idle_seconds integer,
  returned_home boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telematics_trips_provider_time
  ON public.holarchelp_telematics_trips (provider_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.holarchelp_telematics_trips TO authenticated;
GRANT ALL ON public.holarchelp_telematics_trips TO service_role;
ALTER TABLE public.holarchelp_telematics_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider members view trips"
  ON public.holarchelp_telematics_trips FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_providers p
               WHERE p.id = holarchelp_telematics_trips.provider_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_members m
               WHERE m.provider_id = holarchelp_telematics_trips.provider_id AND m.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Drivers insert own trips"
  ON public.holarchelp_telematics_trips FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Drivers update own trips"
  ON public.holarchelp_telematics_trips FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
