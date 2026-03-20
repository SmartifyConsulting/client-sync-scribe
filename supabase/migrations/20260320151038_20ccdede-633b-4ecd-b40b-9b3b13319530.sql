ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS organ_donor boolean DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS organ_donor_organs jsonb DEFAULT '[]'::jsonb;