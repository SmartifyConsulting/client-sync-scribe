
ALTER TABLE public.holarchelp_hospitals
  ADD COLUMN IF NOT EXISTS accepting_patients boolean NOT NULL DEFAULT true;

ALTER TABLE public.holarchelp_ambulance_providers
  ADD COLUMN IF NOT EXISTS accepting_patients boolean NOT NULL DEFAULT true;
