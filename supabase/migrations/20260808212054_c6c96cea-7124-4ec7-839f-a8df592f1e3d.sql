REVOKE EXECUTE ON FUNCTION public.is_practice_assistant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shares_practice(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assistant_of_doctor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_practice_assistant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_practice(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assistant_of_doctor(uuid, uuid) TO authenticated, service_role;