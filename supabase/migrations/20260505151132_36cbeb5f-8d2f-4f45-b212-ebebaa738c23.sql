-- About Me on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS about_me text;
ALTER TABLE public.profiles ADD CONSTRAINT about_me_word_limit CHECK (
  about_me IS NULL OR
  array_length(regexp_split_to_array(trim(about_me), '\s+'), 1) <= 600
);

-- Drop secondary languages
ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_languages;

-- External doctor on sessions (free-text, no FK)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS external_doctor_name text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS external_doctor_specialty text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS external_doctor_practice text;

-- Replace search_doctor_profiles with multi-criteria version
DROP FUNCTION IF EXISTS public.search_doctor_profiles(text);

CREATE OR REPLACE FUNCTION public.search_doctor_profiles(
  _name text DEFAULT NULL,
  _specialty text DEFAULT NULL,
  _language text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, full_name text, specialty text, practice_address text,
  mobile_number text, avatar_url text, practice_number text, doctor_number text,
  about_me text, preferred_language text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.specialty, p.practice_address,
         p.mobile_number, p.avatar_url, p.practice_number, p.doctor_number,
         p.about_me, p.preferred_language
  FROM public.profiles p
  WHERE p.role = 'doctor'::user_role
    AND auth.uid() IS NOT NULL
    AND (
      _name IS NULL OR _name = ''
      OR p.full_name ILIKE '%' || _name || '%'
      OR p.practice_number = _name
      OR p.doctor_number = _name
    )
    AND (
      _specialty IS NULL OR _specialty = ''
      OR p.specialty ILIKE '%' || _specialty || '%'
    )
    AND (
      _language IS NULL OR _language = ''
      OR p.preferred_language = _language
    )
  LIMIT 50;
$$;