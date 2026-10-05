-- Personal Information fields from the Information Questionnaire that
-- weren't previously captured.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS maiden_name text,
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS smoker text,
  ADD COLUMN IF NOT EXISTS smoker_quantity text,
  ADD COLUMN IF NOT EXISTS highest_education text,
  ADD COLUMN IF NOT EXISTS self_employed text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS employer_years text,
  ADD COLUMN IF NOT EXISTS tax_reference_number text;
