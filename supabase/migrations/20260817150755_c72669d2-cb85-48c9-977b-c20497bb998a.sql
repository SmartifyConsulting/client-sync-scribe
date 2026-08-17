CREATE OR REPLACE FUNCTION public.get_my_profile_views()
RETURNS TABLE (
  id uuid,
  viewer_id uuid,
  viewer_name text,
  viewer_role text,
  screen text,
  viewed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id,
         v.viewer_id,
         COALESCE(NULLIF(p.full_name, ''), 'Unknown user') AS viewer_name,
         COALESCE((
           SELECT ur.role::text FROM public.user_roles ur
           WHERE ur.user_id = v.viewer_id
           ORDER BY ur.role LIMIT 1
         ), 'user') AS viewer_role,
         COALESCE(NULLIF(v.screen, ''), 'Profile') AS screen,
         v.viewed_at
  FROM public.profile_view_log v
  LEFT JOIN public.profiles p ON p.id = v.viewer_id
  WHERE v.owner_id = auth.uid()
    AND v.viewer_id <> auth.uid()
  ORDER BY v.viewed_at DESC
  LIMIT 1000;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile_views() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_views() TO authenticated;