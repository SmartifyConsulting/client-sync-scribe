ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS blood_type text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS family_history jsonb DEFAULT '[]'::jsonb;