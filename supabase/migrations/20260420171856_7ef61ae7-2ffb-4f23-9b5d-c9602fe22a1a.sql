
-- 1. Harden get_users_admin() with role check
CREATE OR REPLACE FUNCTION public.get_users_admin()
RETURNS TABLE(user_id uuid, email text, full_name text, role text, created_at timestamp with time zone, status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    u.email::text,
    p.full_name,
    COALESCE(ur.role::text, 'none') AS role,
    p.created_at,
    COALESCE(p.status, 'active') AS status
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

-- 2. Restrict CPD certificates storage to owner
DROP POLICY IF EXISTS "Users can view CPD certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete CPD certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload CPD certificates" ON storage.objects;

CREATE POLICY "Users can upload their own CPD certificates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cpd-certificates'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own CPD certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cpd-certificates'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own CPD certificates"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cpd-certificates'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Make CPD bucket private since no longer needs public access
UPDATE storage.buckets SET public = false WHERE id = 'cpd-certificates';

-- 3. Make health-photos bucket private and restrict SELECT to owner
UPDATE storage.buckets SET public = false WHERE id = 'health-photos';

DROP POLICY IF EXISTS "Health photos are publicly readable" ON storage.objects;

CREATE POLICY "Users can view their own health photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'health-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
