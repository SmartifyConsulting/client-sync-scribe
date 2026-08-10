ALTER TABLE public.patients ADD COLUMN allergies_structured jsonb DEFAULT '[]'::jsonb;
