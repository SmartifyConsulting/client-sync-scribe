ALTER TABLE public.biolog_biological_age_assessments
  ADD COLUMN IF NOT EXISTS markers jsonb NOT NULL DEFAULT '{}'::jsonb;