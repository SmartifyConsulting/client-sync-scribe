
-- Backfill pending offers for the in-flight test incident INC-2026-001070
-- using haversine distance from its reporter location to each approved + accepting ambulance provider.
WITH incident AS (
  SELECT id, COALESCE(
    (SELECT json_build_object('lat', latitude, 'lng', longitude)
       FROM public.holarchelp_locations
      WHERE incident_id = 'e8add7b5-808c-4651-8483-c809cea7e0c8'
      ORDER BY recorded_at DESC LIMIT 1),
    json_build_object('lat', -26.1076, 'lng', 28.0567)
  ) AS loc
  FROM public.holarchelp_incidents
  WHERE id = 'e8add7b5-808c-4651-8483-c809cea7e0c8'
),
nearby AS (
  SELECT a.id AS provider_id,
         ROUND(
           (2 * 6371 * asin(sqrt(
             power(sin(radians((a.latitude - ((SELECT (loc->>'lat')::float FROM incident))) / 2)), 2)
             + cos(radians((SELECT (loc->>'lat')::float FROM incident)))
             * cos(radians(a.latitude))
             * power(sin(radians((a.longitude - ((SELECT (loc->>'lng')::float FROM incident))) / 2)), 2)
           )))::numeric, 2
         ) AS distance_km
  FROM public.holarchelp_ambulance_providers a
  WHERE a.status = 'approved'::holarchelp_provider_status
    AND a.accepting_patients = true
    AND a.latitude IS NOT NULL
    AND a.longitude IS NOT NULL
)
INSERT INTO public.holarchelp_incident_offers (incident_id, provider_id, provider_kind, response, distance_km)
SELECT 'e8add7b5-808c-4651-8483-c809cea7e0c8', provider_id, 'ambulance', 'pending', distance_km
FROM nearby
ORDER BY distance_km ASC
LIMIT 12
ON CONFLICT (incident_id, provider_id) DO UPDATE
  SET response = 'pending', distance_km = EXCLUDED.distance_km, responded_at = NULL;

-- Update the RPC to fall back to nearby approved providers when no offers exist
-- for an open incident the caller owns.
CREATE OR REPLACE FUNCTION public.holarchelp_get_incident_offers(_incident_id uuid)
 RETURNS TABLE(provider_id uuid, provider_kind text, response text, distance_km numeric, name text, ownership text, accepting_patients boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _assigned uuid;
  _dest uuid;
  _status text;
  _allowed boolean := false;
  _auto_assigned_at timestamptz;
  _show_change_options boolean := false;
  _has_rows boolean := false;
  _inc_lat double precision;
  _inc_lng double precision;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT user_id, assigned_provider_id, destination_hospital_id, status::text
    INTO _owner, _assigned, _dest, _status
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

  SELECT e.created_at INTO _auto_assigned_at
  FROM public.holarchelp_incident_events e
  WHERE e.incident_id = _incident_id
    AND e.event_type = 'auto_assigned'
  ORDER BY e.created_at DESC
  LIMIT 1;

  _show_change_options := _owner = _uid
    AND _assigned IS NOT NULL
    AND _auto_assigned_at IS NOT NULL
    AND now() <= (_auto_assigned_at + interval '30 seconds');

  -- Primary: per-incident offers
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
    AND (
      o.response = 'pending'
      OR (_show_change_options AND o.response IN ('accepted','superseded'))
    )
    AND (
      (o.provider_kind = 'ambulance' AND a.id IS NOT NULL AND a.status = 'approved'::holarchelp_provider_status)
      OR
      (o.provider_kind = 'hospital' AND h.id IS NOT NULL AND h.status = 'approved'::holarchelp_provider_status)
    )
  ORDER BY o.distance_km ASC NULLS LAST;

  GET DIAGNOSTICS _has_rows = ROW_COUNT;

  -- Fallback: when no offers exist for an open incident the owner is viewing,
  -- list nearby approved + accepting ambulance providers ordered by haversine distance.
  IF _has_rows = false AND _owner = _uid AND _status IN ('open','reopened') THEN
    SELECT latitude, longitude INTO _inc_lat, _inc_lng
    FROM public.holarchelp_locations
    WHERE incident_id = _incident_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    RETURN QUERY
    SELECT
      a.id AS provider_id,
      'ambulance'::text AS provider_kind,
      'pending'::text AS response,
      CASE
        WHEN _inc_lat IS NULL OR _inc_lng IS NULL OR a.latitude IS NULL OR a.longitude IS NULL THEN NULL
        ELSE ROUND(
          (2 * 6371 * asin(sqrt(
            power(sin(radians((a.latitude - _inc_lat) / 2)), 2)
            + cos(radians(_inc_lat)) * cos(radians(a.latitude))
            * power(sin(radians((a.longitude - _inc_lng) / 2)), 2)
          )))::numeric, 2
        )
      END AS distance_km,
      a.company_name AS name,
      a.ownership AS ownership,
      a.accepting_patients AS accepting_patients
    FROM public.holarchelp_ambulance_providers a
    WHERE a.status = 'approved'::holarchelp_provider_status
      AND a.accepting_patients = true
      AND a.latitude IS NOT NULL
      AND a.longitude IS NOT NULL
    ORDER BY distance_km ASC NULLS LAST
    LIMIT 12;
  END IF;
END;
$function$;
