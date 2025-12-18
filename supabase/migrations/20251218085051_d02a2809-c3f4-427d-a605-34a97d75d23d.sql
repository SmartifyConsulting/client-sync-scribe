-- Add marital_status and next_of_kin_relationship columns to patients table
ALTER TABLE public.patients 
ADD COLUMN marital_status text,
ADD COLUMN next_of_kin_relationship text;