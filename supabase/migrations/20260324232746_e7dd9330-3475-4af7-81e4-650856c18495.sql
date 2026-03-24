ALTER TABLE public.visit_ratings
  ADD COLUMN IF NOT EXISTS communication_rating smallint,
  ADD COLUMN IF NOT EXISTS expertise_rating smallint,
  ADD COLUMN IF NOT EXISTS professionalism_rating smallint;