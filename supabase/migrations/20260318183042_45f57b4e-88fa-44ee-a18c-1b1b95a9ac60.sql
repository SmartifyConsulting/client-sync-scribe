ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS signature_font_size integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS signature_bold boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_italic boolean DEFAULT false;