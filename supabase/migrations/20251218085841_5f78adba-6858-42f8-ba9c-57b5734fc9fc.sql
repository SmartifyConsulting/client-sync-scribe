-- Add ID/Passport number and gender fields to patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS id_passport_number text,
ADD COLUMN IF NOT EXISTS gender text;