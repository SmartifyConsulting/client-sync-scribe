REVOKE EXECUTE ON FUNCTION public.nurse_ward_id(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_hospital_nurse(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_see_ward(uuid, uuid, uuid) FROM PUBLIC, anon;