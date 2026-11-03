-- Same stale-rename bug as can_view_patient_record: this function predates
-- the patients->clients and doctor_patient_access->broker_client_access
-- renames and was never updated, breaking the sessions RLS policy that
-- calls it (via can_view_patient_record or similar historical-access checks).
CREATE OR REPLACE FUNCTION public.doctor_had_access_at(_patient_id uuid, _created_at timestamp with time zone)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.clients p
    JOIN public.broker_client_access dpa ON dpa.patient_user_id = p.patient_user_id
    WHERE p.id = _patient_id
      AND dpa.doctor_id = auth.uid()
      AND ( dpa.is_active = true OR _created_at <= COALESCE(dpa.revoked_at, now()) )
  );
$function$;
