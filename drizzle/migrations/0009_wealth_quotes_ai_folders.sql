ALTER TABLE public.wealth_quotes
  ADD COLUMN IF NOT EXISTS cover_type text,
  ADD COLUMN IF NOT EXISTS excess numeric,
  ADD COLUMN IF NOT EXISTS ai_rank integer,
  ADD COLUMN IF NOT EXISTS ai_reason text,
  ADD COLUMN IF NOT EXISTS broker_overridden boolean NOT NULL DEFAULT false;