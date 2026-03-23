ALTER TABLE public.moola_partner_apps 
  ADD COLUMN IF NOT EXISTS creator text,
  ADD COLUMN IF NOT EXISTS signup_url text;