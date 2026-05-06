ALTER TABLE public.holarchelp_incident_offers
  ADD COLUMN IF NOT EXISTS provider_kind text NOT NULL DEFAULT 'ambulance'
  CHECK (provider_kind IN ('ambulance','hospital'));