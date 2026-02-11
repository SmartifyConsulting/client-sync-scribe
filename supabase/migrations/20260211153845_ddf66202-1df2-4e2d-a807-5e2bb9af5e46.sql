
CREATE OR REPLACE FUNCTION public.get_users_admin()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as user_id,
    u.email::text,
    p.full_name,
    COALESCE(ur.role::text, 'none') as role,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC
$$;
