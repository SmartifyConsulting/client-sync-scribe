-- Fix "record 'new' has no field 'updated_by'" when saving practice logos:
-- wealth_practice_info is missing the column a touch-trigger writes to.
ALTER TABLE public.wealth_practice_info
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
