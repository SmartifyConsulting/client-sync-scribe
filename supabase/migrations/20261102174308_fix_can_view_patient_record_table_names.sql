-- can_view_patient_record() predates the patients->clients and
-- doctor_patient_access->broker_client_access renames and was never updated,
-- so every caller (wealth_start_workflow RPC, the sessions/wealth_workflows
-- RLS policies, etc.) failed with "relation public.patients does not exist".
CREATE OR REPLACE FUNCTION public.can_view_patient_record(_patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.clients p
    WHERE p.id = _patient_id
      AND (
        p.user_id = auth.uid()
        OR p.patient_user_id = auth.uid()
        OR (
          p.patient_user_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.broker_client_access dpa
            WHERE dpa.patient_user_id = p.patient_user_id
              AND dpa.doctor_id = auth.uid()
              AND dpa.is_active = true
          )
        )
        OR public.assistant_of_doctor(auth.uid(), p.user_id)
      )
  )
$function$;
