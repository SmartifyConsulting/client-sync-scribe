ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS allergies_structured jsonb DEFAULT '[]'::jsonb;