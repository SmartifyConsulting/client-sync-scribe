
-- Demo override: always include Renken as the top pending offer,
-- and always auto-assign to Renken.

CREATE OR REPLACE FUNCTION public.holarchelp_auto_assign_incident(_incident_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _provider_id uuid;
  _kind text;
  _updated uuid;
  _status text;
  _assigned uuid;
  _renken_id constant uuid := '121ae795-b2b1-4693-93bf-a2ba1dfdaeae';
  _renken_ok boolean := false;
  _inc_lat double precision;
  _inc_lng double precision;
  _renken_dist numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT status, assigned_provider_id INTO _status, _assigned
    FROM public.holarchelp_incidents WHERE id = _incident_id;
  IF _status IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;
  IF _assigned IS NOT NULL OR _status NOT IN ('open','reopened') THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'already_assigned');
  END IF;

  -- DEMO: force a Renken pending offer if the provider exists & approved
  SELECT true INTO _renken_ok FROM public.holarchelp_ambulance_providers
    WHERE id = _renken_id AND status = 'approved'::holarchelp_provider_status;

  IF _renken_ok THEN
    SELECT latitude, longitude INTO _inc_lat, _inc_lng
      FROM public.holarchelp_locations
      WHERE incident_id = _incident_id
      ORDER BY recorded_at DESC LIMIT 1;

    _renken_dist := 0;

    INSERT INTO public.holarchelp_incident_offers
      (incident_id, provider_id, provider_kind, response, distance_km)
    VALUES
      (_incident_id, _renken_id, 'ambulance', 'pending', _renken_dist)
    ON CONFLICT DO NOTHING;

    _provider_id := _renken_id;
    _kind := 'ambulance';
  END IF;

  IF _provider_id IS NULL THEN
    SELECT provider_id, provider_kind INTO _provider_id, _kind
      FROM public.holarchelp_incident_offers
      WHERE incident_id = _incident_id
        AND response = 'pending'
        AND provider_kind = 'ambulance'
      ORDER BY distance_km ASC NULLS LAST
      LIMIT 1;
  END IF;

  IF _provider_id IS NULL THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'no_offers');
  END IF;

  UPDATE public.holarchelp_incidents
    SET assigned_provider_id = _provider_id,
        status = 'assigned',
        accepted_at = now()
    WHERE id = _incident_id
      AND assigned_provider_id IS NULL
      AND status IN ('open','reopened')
    RETURNING id INTO _updated;

  IF _updated IS NULL THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'race_lost');
  END IF;

  UPDATE public.holarchelp_incident_offers
    SET response = 'accepted', responded_at = now()
    WHERE incident_id = _incident_id AND provider_id = _provider_id;
  UPDATE public.holarchelp_incident_offers
    SET response = 'superseded', responded_at = now()
    WHERE incident_id = _incident_id AND provider_id <> _provider_id AND response = 'pending';

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _provider_id, _uid, 'auto_assigned',
            jsonb_build_object('provider_id', _provider_id, 'kind', _kind, 'demo_forced_renken', _renken_ok));

  RETURN jsonb_build_object('assigned', true, 'provider_id', _provider_id, 'kind', _kind);
END $function$;


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
  _row_count integer := 0;
  _inc_lat double precision;
  _inc_lng double precision;
  _renken_id constant uuid := '121ae795-b2b1-4693-93bf-a2ba1dfdaeae';
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

  GET DIAGNOSTICS _row_count = ROW_COUNT;

  IF _row_count = 0 AND _owner = _uid AND _status IN ('open','reopened') THEN
    SELECT latitude, longitude INTO _inc_lat, _inc_lng
    FROM public.holarchelp_locations
    WHERE incident_id = _incident_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    -- DEMO: always surface Renken first with distance 0
    RETURN QUERY
    SELECT
      a.id AS provider_id,
      'ambulance'::text AS provider_kind,
      'pending'::text AS response,
      0::numeric AS distance_km,
      a.company_name AS name,
      a.ownership AS ownership,
      a.accepting_patients AS accepting_patients
    FROM public.holarchelp_ambulance_providers a
    WHERE a.id = _renken_id
      AND a.status = 'approved'::holarchelp_provider_status;

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
      AND a.id <> _renken_id
      AND a.latitude IS NOT NULL
      AND a.longitude IS NOT NULL
    ORDER BY distance_km ASC NULLS LAST
    LIMIT 11;
  END IF;
END;
$function$;
