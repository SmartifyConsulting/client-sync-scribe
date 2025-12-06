-- Add medical_insurance_product column to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medical_insurance_product text;