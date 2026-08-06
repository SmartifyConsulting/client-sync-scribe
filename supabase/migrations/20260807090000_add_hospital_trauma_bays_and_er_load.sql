-- ErCapacityScreen has always let hospital staff edit "Trauma Bays Available"
-- and "ER Load (% utilised)", but no such columns ever existed on
-- holarchelp_hospitals — every save to them silently targeted a
-- nonexistent column. Add the two real columns.

ALTER TABLE public.holarchelp_hospitals
  ADD COLUMN IF NOT EXISTS trauma_bays_available integer,
  ADD COLUMN IF NOT EXISTS er_load_percent integer;
