
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

  -- Allow up to 90 seconds to accommodate user-initiated extensions of the change window
  IF now() > (_auto_assigned_at + interval '90 seconds') THEN
    RAISE EXCEPTION 'The ER Provider change window has closed';
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
         eta_minutes = NULL
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
      'reason', 'patient_changed_provider_within_window',
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
