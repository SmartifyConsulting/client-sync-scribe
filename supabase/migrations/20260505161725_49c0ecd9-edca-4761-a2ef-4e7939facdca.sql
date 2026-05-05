ALTER TABLE public.patient_profile_shares
  ADD COLUMN IF NOT EXISTS shared_with_first_name text,
  ADD COLUMN IF NOT EXISTS shared_with_last_name text;