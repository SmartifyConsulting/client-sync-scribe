CREATE OR REPLACE FUNCTION public.holarchelp_auto_assign_incident(_incident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _provider_id uuid;
  _kind text;
  _updated uuid;
  _status text;
  _assigned uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT status, assigned_provider_id INTO _status, _assigned
    FROM public.holarchelp_incidents WHERE id = _incident_id;
  IF _status IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;
  IF _assigned IS NOT NULL OR _status NOT IN ('open','reopened') THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'already_assigned');
  END IF;

  SELECT provider_id, provider_kind INTO _provider_id, _kind
    FROM public.holarchelp_incident_offers
    WHERE incident_id = _incident_id
      AND response = 'pending'
      AND provider_kind = 'ambulance'
    ORDER BY distance_km ASC NULLS LAST
    LIMIT 1;

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
            jsonb_build_object('provider_id', _provider_id, 'kind', _kind));

  RETURN jsonb_build_object('assigned', true, 'provider_id', _provider_id, 'kind', _kind);
END $$;