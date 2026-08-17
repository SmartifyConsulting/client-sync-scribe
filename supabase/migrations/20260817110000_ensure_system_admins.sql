-- Ensure both system admins hold the admin role, looked up live by email so
-- this is correct regardless of any past patient-record merge that may have
-- changed which auth.users row an account's session now resolves to.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email IN ('info@georgiaadams.co.za', 'georgia.adams@smartify.co.za')
ON CONFLICT (user_id, role) DO NOTHING;
