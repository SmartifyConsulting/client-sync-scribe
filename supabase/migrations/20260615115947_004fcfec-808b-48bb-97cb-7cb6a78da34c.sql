
ALTER TABLE public.holarchelp_hospitals
  ADD COLUMN IF NOT EXISTS directors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS license_file_path text,
  ADD COLUMN IF NOT EXISTS license_file_mime text,
  ADD COLUMN IF NOT EXISTS license_file_size_bytes integer,
  ADD COLUMN IF NOT EXISTS admin_full_name text,
  ADD COLUMN IF NOT EXISTS admin_email text,
  ADD COLUMN IF NOT EXISTS admin_phone text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.holarchelp_ambulance_providers
  ADD COLUMN IF NOT EXISTS directors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS license_file_path text,
  ADD COLUMN IF NOT EXISTS license_file_mime text,
  ADD COLUMN IF NOT EXISTS license_file_size_bytes integer,
  ADD COLUMN IF NOT EXISTS admin_full_name text,
  ADD COLUMN IF NOT EXISTS admin_email text,
  ADD COLUMN IF NOT EXISTS admin_phone text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Storage RLS for provider-licenses bucket (bucket created via storage tool)
CREATE POLICY "provider_licenses_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'provider-licenses'
    AND (storage.foldername(name))[1] = 'pending'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "provider_licenses_select_own_or_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'provider-licenses'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::public.user_role)
    )
  );

CREATE POLICY "provider_licenses_delete_own_or_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'provider-licenses'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::public.user_role)
    )
  );

-- RPC to reject a pending provider with optional reason
CREATE OR REPLACE FUNCTION public.holarchelp_reject_provider(_provider_id uuid, _kind text, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can reject';
  END IF;
  IF _kind = 'hospital' THEN
    UPDATE public.holarchelp_hospitals
      SET status = 'rejected'::holarchelp_provider_status,
          rejection_reason = _reason
      WHERE id = _provider_id;
  ELSIF _kind = 'ambulance' THEN
    UPDATE public.holarchelp_ambulance_providers
      SET status = 'rejected'::holarchelp_provider_status,
          rejection_reason = _reason
      WHERE id = _provider_id;
  ELSE
    RAISE EXCEPTION 'Invalid kind: %', _kind;
  END IF;
END $$;
