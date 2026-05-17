-- Safe resolver: returns offers with provider display fields, bypassing RLS on provider tables
CREATE OR REPLACE FUNCTION public.holarchelp_get_incident_offers(_incident_id uuid)
RETURNS TABLE (
  provider_id uuid,
  provider_kind text,
  response text,
  distance_km numeric,
  name text,
  ownership text,
  accepting_patients boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  FROM public.holarchelp_incidents WHERE id = _incident_id;
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
  SELECT
    o.provider_id,
    o.provider_kind,
    o.response,
    o.distance_km,
    CASE WHEN o.provider_kind = 'ambulance' THEN a.company_name ELSE h.name END AS name,
    CASE WHEN o.provider_kind = 'ambulance' THEN a.ownership ELSE h.ownership END AS ownership,
    CASE WHEN o.provider_kind = 'ambulance' THEN a.accepting_patients ELSE h.accepting_patients END AS accepting_patients
  FROM public.holarchelp_incident_offers o
  LEFT JOIN public.holarchelp_ambulance_providers a
    ON o.provider_kind = 'ambulance' AND a.id = o.provider_id
  LEFT JOIN public.holarchelp_hospitals h
    ON o.provider_kind = 'hospital' AND h.id = o.provider_id
  WHERE o.incident_id = _incident_id
    AND o.response = 'pending'
    AND (
      (o.provider_kind = 'ambulance' AND a.id IS NOT NULL AND a.status = 'approved'::holarchelp_provider_status)
      OR
      (o.provider_kind = 'hospital' AND h.id IS NOT NULL AND h.status = 'approved'::holarchelp_provider_status)
    )
  ORDER BY o.distance_km ASC NULLS LAST;
END;
$$;

-- Supersede pending offers that point to inactive/unresolvable providers so they stop being shown
UPDATE public.holarchelp_incident_offers o
SET response = 'superseded', responded_at = now()
WHERE response = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM public.holarchelp_ambulance_providers a
    WHERE o.provider_kind = 'ambulance' AND a.id = o.provider_id
      AND a.status = 'approved'::holarchelp_provider_status
      AND a.subscription_status = 'active'::holarchelp_subscription_status
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.holarchelp_hospitals h
    WHERE o.provider_kind = 'hospital' AND h.id = o.provider_id
      AND h.status = 'approved'::holarchelp_provider_status
      AND h.subscription_status = 'active'::holarchelp_subscription_status
  );
