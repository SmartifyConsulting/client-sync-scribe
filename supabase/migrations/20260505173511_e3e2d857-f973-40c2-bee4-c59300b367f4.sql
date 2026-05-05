ALTER TABLE public.holarchelp_emergency_contacts
  ADD COLUMN IF NOT EXISTS notify_min_severity text NOT NULL DEFAULT 'low'
  CHECK (notify_min_severity IN ('low','medium','high','critical'));

ALTER TABLE public.holarchelp_incidents
  ADD COLUMN IF NOT EXISTS coverage text NOT NULL DEFAULT 'public'
  CHECK (coverage IN ('public','private'));