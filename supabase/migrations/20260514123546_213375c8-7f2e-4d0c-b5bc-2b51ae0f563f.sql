
CREATE OR REPLACE FUNCTION public.holarchelp_patient_pick_provider(_incident_id uuid, _provider_id uuid, _kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _updated uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _kind NOT IN ('ambulance','hospital') THEN
    RAISE EXCEPTION 'Invalid kind %', _kind;
  END IF;

  SELECT user_id INTO _owner FROM public.holarchelp_incidents WHERE id = _incident_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;
  IF _owner <> _uid THEN RAISE EXCEPTION 'Not authorised'; END IF;

  UPDATE public.holarchelp_incidents
    SET assigned_provider_id = _provider_id,
        status = 'assigned',
        accepted_at = now()
    WHERE id = _incident_id
      AND assigned_provider_id IS NULL
      AND status IN ('open','reopened')
    RETURNING id INTO _updated;

  IF _updated IS NULL THEN
    RAISE EXCEPTION 'Incident already taken';
  END IF;

  INSERT INTO public.holarchelp_incident_offers(incident_id, provider_id, provider_kind, response, responded_at)
    VALUES (_incident_id, _provider_id, _kind, 'accepted', now())
  ON CONFLICT (incident_id, provider_id)
    DO UPDATE SET response='accepted', responded_at=now(), provider_kind=EXCLUDED.provider_kind;

  UPDATE public.holarchelp_incident_offers
    SET response='superseded', responded_at=now()
    WHERE incident_id=_incident_id AND provider_id<>_provider_id AND response='pending';

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _provider_id, _uid, 'patient_picked', jsonb_build_object('provider_id', _provider_id, 'kind', _kind));

  RETURN jsonb_build_object('locked', true, 'provider_id', _provider_id, 'kind', _kind);
END $function$;
