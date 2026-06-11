-- 1. Remove user self-read on messaging log (exposes contact PII of third parties)
DROP POLICY IF EXISTS "Users view own guardian messaging log" ON public.holarchelp_messaging_log;

-- 2. Update can_access_holarchelp_incident to include destination hospital staff
CREATE OR REPLACE FUNCTION public.can_access_holarchelp_incident(_incident_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.holarchelp_incidents i
    WHERE i.id = _incident_id
      AND (
        i.user_id = auth.uid()
        OR i.triggered_by_user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::user_role)
        OR (i.assigned_provider_id IS NOT NULL
            AND (public.is_ambulance_staff(i.assigned_provider_id, auth.uid())
                 OR public.is_hospital_staff(i.assigned_provider_id, auth.uid())))
        OR (i.destination_hospital_id IS NOT NULL
            AND public.is_hospital_staff(i.destination_hospital_id, auth.uid()))
      )
  );
$function$;