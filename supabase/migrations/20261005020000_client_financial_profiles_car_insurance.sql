-- Car / short-term insurance details, captured from the Information
-- Questionnaire but missing from the structured Needs Analysis fields.
ALTER TABLE public.client_financial_profiles
  ADD COLUMN IF NOT EXISTS car_insurance jsonb;
