-- Add mobile_number to profiles for contact information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mobile_number TEXT;