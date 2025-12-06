-- Add claims email field to patients table
ALTER TABLE public.patients 
ADD COLUMN claims_email text;