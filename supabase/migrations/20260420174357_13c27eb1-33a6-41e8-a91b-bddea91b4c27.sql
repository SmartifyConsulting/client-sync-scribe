
-- 1. Fix pricing_config: remove doctor INSERT/UPDATE/SELECT permissions (admin-only table)
DROP POLICY IF EXISTS "Doctors can insert pricing" ON public.pricing_config;
DROP POLICY IF EXISTS "Doctors can update pricing" ON public.pricing_config;
DROP POLICY IF EXISTS "Doctors can select pricing" ON public.pricing_config;
-- "Anyone can view pricing" remains so doctors/patients can read pricing for their plans

-- 2. Fix profiles broad doctor exposure: drop the wide policy and replace with a SECURITY DEFINER
-- function that returns only safe public columns for doctor search.
DROP POLICY IF EXISTS "Authenticated users can search doctor profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.search_doctor_profiles(_query text)
RETURNS TABLE (
  id uuid,
  full_name text,
  specialty text,
  practice_address text,
  mobile_number text,
  avatar_url text,
  practice_number text,
  doctor_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.specialty, p.practice_address,
         p.mobile_number, p.avatar_url, p.practice_number, p.doctor_number
  FROM public.profiles p
  WHERE p.role = 'doctor'::user_role
    AND auth.uid() IS NOT NULL
    AND (
      _query IS NULL
      OR _query = ''
      OR p.full_name ILIKE '%' || _query || '%'
      OR p.practice_number = _query
      OR p.doctor_number = _query
    )
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_doctor_profiles(text) TO authenticated;

-- 3. Storage buckets: remove broad public SELECT, allow only authenticated users to read metadata.
-- Direct public URLs (CDN) for these public buckets continue to work for image display.
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view media" ON storage.objects;

CREATE POLICY "Authenticated users can read avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can read logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can read patient media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'patient-media');
