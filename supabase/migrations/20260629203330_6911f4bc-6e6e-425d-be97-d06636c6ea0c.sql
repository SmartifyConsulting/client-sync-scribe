ALTER TABLE public.hospital_admissions ADD COLUMN IF NOT EXISTS codes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS skip_notify_target text;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS skip_notify_contact jsonb;