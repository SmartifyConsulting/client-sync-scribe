CREATE OR REPLACE FUNCTION public.is_hospital_staff(_hospital_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS(SELECT 1 FROM public.holarchelp_hospitals WHERE id=_hospital_id AND owner_id=_user_id)
      OR EXISTS(SELECT 1 FROM public.holarchelp_hospital_members WHERE hospital_id=_hospital_id AND user_id=_user_id)
      OR EXISTS(SELECT 1 FROM public.hospital_nurses WHERE hospital_id=_hospital_id AND linked_user_id=_user_id);
$function$;