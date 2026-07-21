
-- 1. doctor_has_access_request_from: restrict to pending/accepted requests
CREATE OR REPLACE FUNCTION public.doctor_has_access_request_from(patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM doctor_access_requests dar
    JOIN profiles dp ON dp.practice_number = dar.doctor_practice_number
      AND dp.doctor_number = dar.doctor_registration_number
    WHERE dar.patient_user_id = patient_id
      AND dp.id = auth.uid()
      AND dar.status::text IN ('pending', 'accepted', 'approved')
  )
$$;

-- 2. notifications: remove client self-insert; backend/service_role only
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;

-- 3. practice_members: owner-only insert
DROP POLICY IF EXISTS "Owner can add members" ON public.practice_members;
CREATE POLICY "Owner can add members"
ON public.practice_members FOR INSERT
TO authenticated
WITH CHECK (public.is_practice_owner(practice_id, auth.uid()));

-- 4. provider-licenses storage: require an owned provider record referencing this path
CREATE OR REPLACE FUNCTION public.user_owns_provider_license_path(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.holarchelp_hospitals
            WHERE license_file_path = _path AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_providers
               WHERE license_file_path = _path AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.holarchelp_insurance_providers
               WHERE license_file_path = _path AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.holarchelp_pharmacies
               WHERE license_file_path = _path AND owner_id = auth.uid())
$$;

DROP POLICY IF EXISTS "provider_licenses_insert_own" ON storage.objects;
CREATE POLICY "provider_licenses_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'provider-licenses'
    AND (storage.foldername(name))[1] = 'pending'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (
      public.has_role(auth.uid(), 'admin'::public.user_role)
      OR public.user_owns_provider_license_path(name)
    )
  );
