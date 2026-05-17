CREATE OR REPLACE FUNCTION public.holarchelp_get_incident_providers_public(_incident_id uuid)
RETURNS TABLE(id uuid, kind text, display_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _assigned uuid;
  _dest uuid;
  _allowed boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT user_id, assigned_provider_id, destination_hospital_id
    INTO _owner, _assigned, _dest
  FROM public.holarchelp_incidents WHERE holarchelp_incidents.id = _incident_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;

  IF _owner = _uid THEN _allowed := true; END IF;
  IF NOT _allowed AND public.has_role(_uid, 'admin'::user_role) THEN _allowed := true; END IF;
  IF NOT _allowed AND _assigned IS NOT NULL
     AND (public.is_ambulance_staff(_assigned, _uid) OR public.is_hospital_staff(_assigned, _uid)) THEN
    _allowed := true;
  END IF;
  IF NOT _allowed AND _dest IS NOT NULL AND public.is_hospital_staff(_dest, _uid) THEN
    _allowed := true;
  END IF;
  IF NOT _allowed THEN RAISE EXCEPTION 'Not authorised'; END IF;

  RETURN QUERY
  WITH ids AS (
    SELECT DISTINCT pid FROM (
      SELECT e.provider_id AS pid FROM public.holarchelp_incident_events e
        WHERE e.incident_id = _incident_id AND e.provider_id IS NOT NULL
      UNION
      SELECT (e.payload->>'provider_id')::uuid AS pid FROM public.holarchelp_incident_events e
        WHERE e.incident_id = _incident_id
          AND e.payload ? 'provider_id'
          AND (e.payload->>'provider_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) s WHERE pid IS NOT NULL
  )
  SELECT a.id, 'ambulance'::text, a.company_name
    FROM public.holarchelp_ambulance_providers a
    JOIN ids ON ids.pid = a.id
  UNION ALL
  SELECT h.id, 'hospital'::text, h.name
    FROM public.holarchelp_hospitals h
    JOIN ids ON ids.pid = h.id;
END;
$function$;