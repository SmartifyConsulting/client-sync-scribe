
-- 1. Extend ambulance members to support crew (name, phone, status, shift)
ALTER TABLE public.holarchelp_ambulance_members
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS shift_pattern text;

-- 2. Add crew_member_id linkage to telematics trips/stops/pings (nullable for backward compatibility)
ALTER TABLE public.holarchelp_telematics_pings
  ADD COLUMN IF NOT EXISTS crew_member_id uuid REFERENCES public.holarchelp_ambulance_members(id) ON DELETE SET NULL;
ALTER TABLE public.holarchelp_telematics_stops
  ADD COLUMN IF NOT EXISTS crew_member_id uuid REFERENCES public.holarchelp_ambulance_members(id) ON DELETE SET NULL;
ALTER TABLE public.holarchelp_telematics_trips
  ADD COLUMN IF NOT EXISTS crew_member_id uuid REFERENCES public.holarchelp_ambulance_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendant_member_id uuid REFERENCES public.holarchelp_ambulance_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_telem_pings_crew ON public.holarchelp_telematics_pings(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_telem_trips_crew ON public.holarchelp_telematics_trips(crew_member_id);
