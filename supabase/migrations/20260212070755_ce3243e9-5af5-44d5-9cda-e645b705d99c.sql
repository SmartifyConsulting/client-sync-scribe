
-- Add signature_font, signature_color, and status columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_font text DEFAULT 'sans';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_color text DEFAULT 'black';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
