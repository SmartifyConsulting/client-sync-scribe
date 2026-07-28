ALTER TABLE public.patient_profile_shares
  ADD COLUMN IF NOT EXISTS view_scopes jsonb NOT NULL DEFAULT '[]'::jsonb;