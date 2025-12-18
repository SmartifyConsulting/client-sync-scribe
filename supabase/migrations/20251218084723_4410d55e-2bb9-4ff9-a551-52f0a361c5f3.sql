-- Add inactive_threshold_months column to profiles table for doctors to configure patient inactivity period
ALTER TABLE public.profiles 
ADD COLUMN inactive_threshold_months integer DEFAULT 12;