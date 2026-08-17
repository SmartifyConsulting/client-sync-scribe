CREATE OR REPLACE FUNCTION public.user_owns_provider_license_path(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- self-scoped staging path: pending/<auth.uid()>/<file>
    (
      auth.uid() IS NOT NULL
      AND (storage.foldername(_path))[1] = 'pending'
      AND (storage.foldername(_path))[2] = (auth.uid())::text
      AND array_length(storage.foldername(_path), 1) = 2
    )
    OR EXISTS (SELECT 1 FROM public.holarchelp_hospitals
            WHERE license_file_path = _path AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_providers
               WHERE license_file_path = _path AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.holarchelp_insurance_providers
               WHERE license_file_path = _path AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.holarchelp_pharmacies
               WHERE license_file_path = _path AND owner_id = auth.uid())
$$;

DROP POLICY IF EXISTS provider_licenses_insert_own ON storage.objects;
CREATE POLICY provider_licenses_insert_own
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'provider-licenses'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND array_length(storage.foldername(name), 1) = 2
  AND public.user_owns_provider_license_path(name)
);

DROP POLICY IF EXISTS provider_licenses_select_own_or_admin ON storage.objects;
CREATE POLICY provider_licenses_select_own_or_admin
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'provider-licenses'
  AND ((storage.foldername(name))[2] = (auth.uid())::text OR public.has_role(auth.uid(), 'admin'::user_role))
);

DROP POLICY IF EXISTS provider_licenses_delete_own_or_admin ON storage.objects;
CREATE POLICY provider_licenses_delete_own_or_admin
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'provider-licenses'
  AND ((storage.foldername(name))[2] = (auth.uid())::text OR public.has_role(auth.uid(), 'admin'::user_role))
);