ALTER TABLE public.biolog_foods
  ADD COLUMN IF NOT EXISTS serving_size text,
  ADD COLUMN IF NOT EXISTS kilojoules numeric,
  ADD COLUMN IF NOT EXISTS calories numeric;
