-- Add new columns to patients table for extended patient information
ALTER TABLE public.patients
ADD COLUMN physical_address TEXT,
ADD COLUMN postal_address TEXT,
ADD COLUMN same_as_physical BOOLEAN DEFAULT FALSE,
ADD COLUMN referred_by TEXT,
ADD COLUMN employer TEXT,
ADD COLUMN occupation TEXT,
ADD COLUMN medical_aid TEXT,
ADD COLUMN medical_aid_number TEXT,
ADD COLUMN primary_member TEXT,
ADD COLUMN next_of_kin_name TEXT,
ADD COLUMN next_of_kin_phone TEXT,
ADD COLUMN next_of_kin_email TEXT,
ADD COLUMN general_practitioner TEXT;