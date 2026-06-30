CREATE OR REPLACE FUNCTION public.holarchelp_patient_change_provider(
  _incident_id uuid,
  _provider_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _status text;
  _current_provider uuid;
  _incident_number text;
  _auto_assigned_at timestamptz;
  _provider_kind text;
  _old_provider uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id, status, assigned_provider_id, incident_number
    INTO _owner, _status, _current_provider, _incident_number
  FROM public.holarchelp_incidents
  WHERE id = _incident_id
  FOR UPDATE;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  IF _owner <> _uid THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  IF _status NOT IN ('open','reopened','assigned') THEN
    RAISE EXCEPTION 'This incident can no longer be changed';
  END IF;

  SELECT e.created_at INTO _auto_assigned_at
  FROM public.holarchelp_incident_events e
  WHERE e.incident_id = _incident_id
    AND e.event_type = 'auto_assigned'
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF _auto_assigned_at IS NULL THEN
    RAISE EXCEPTION 'Provider changes are only available after auto-assignment';
  END IF;

  IF now() > (_auto_assigned_at + interval '30 seconds') THEN
    RAISE EXCEPTION 'The 30 second ER Provider change window has closed';
  END IF;

  SELECT provider_kind INTO _provider_kind
  FROM public.holarchelp_incident_offers
  WHERE incident_id = _incident_id
    AND provider_id = _provider_id
    AND provider_kind = 'ambulance'
    AND response IN ('pending','accepted','superseded')
  ORDER BY responded_at NULLS FIRST
  LIMIT 1;

  IF _provider_kind IS NULL THEN
    RAISE EXCEPTION 'Selected ER Provider is not available for this incident';
  END IF;

  IF _current_provider = _provider_id THEN
    RETURN jsonb_build_object(
      'changed', false,
      'reason', 'already_assigned',
      'provider_id', _provider_id,
      'incident_number', _incident_number
    );
  END IF;

  _old_provider := _current_provider;

  UPDATE public.holarchelp_incidents
     SET assigned_provider_id = _provider_id,
         assigned_paramedic_user_id = NULL,
         assigned_ambulance_id = NULL,
         status = 'assigned',
         accepted_at = now(),
         provider_latitude = NULL,
         provider_longitude = NULL,
         last_eta_update = NULL,
         eta_minutes = NULL,
         updated_at = now()
   WHERE id = _incident_id;

  UPDATE public.holarchelp_incident_offers
     SET response = 'superseded', responded_at = now()
   WHERE incident_id = _incident_id
     AND provider_id <> _provider_id
     AND response IN ('pending','accepted');

  INSERT INTO public.holarchelp_incident_offers(incident_id, provider_id, provider_kind, response, responded_at)
  VALUES (_incident_id, _provider_id, 'ambulance', 'accepted', now())
  ON CONFLICT (incident_id, provider_id)
  DO UPDATE SET response = 'accepted', responded_at = now(), provider_kind = 'ambulance';

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
  VALUES (
    _incident_id,
    _provider_id,
    _uid,
    'reassigned',
    jsonb_build_object(
      'reason', 'patient_changed_provider_within_30_seconds',
      'old_provider_id', _old_provider,
      'new_provider_id', _provider_id,
      'incident_number', _incident_number
    )
  );

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
  VALUES (
    _incident_id,
    _provider_id,
    _uid,
    'patient_changed_provider',
    jsonb_build_object(
      'old_provider_id', _old_provider,
      'new_provider_id', _provider_id,
      'incident_number', _incident_number
    )
  );

  RETURN jsonb_build_object(
    'changed', true,
    'provider_id', _provider_id,
    'old_provider_id', _old_provider,
    'incident_number', _incident_number
  );
END;
$$;

REVOKE ALL ON FUNCTION public.holarchelp_patient_change_provider(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.holarchelp_patient_change_provider(uuid, uuid) TO authenticated;

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
  _auto_assigned_at timestamptz;
  _show_change_options boolean := false;
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
END;
$$;

REVOKE ALL ON FUNCTION public.holarchelp_get_incident_offers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.holarchelp_get_incident_offers(uuid) TO authenticated;