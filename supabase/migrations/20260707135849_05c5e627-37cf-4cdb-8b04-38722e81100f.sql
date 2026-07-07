
CREATE OR REPLACE FUNCTION public.holarchelp_set_destination_hospital(
  _incident_id uuid,
  _hospital_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _provider_id uuid;
  _ok boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT assigned_provider_id INTO _provider_id
    FROM public.holarchelp_incidents WHERE id = _incident_id;
  IF _provider_id IS NULL THEN
    RAISE EXCEPTION 'Incident has no assigned provider';
  END IF;

  SELECT true INTO _ok FROM public.holarchelp_ambulance_providers
   WHERE id = _provider_id AND owner_id = _uid;
  IF NOT _ok THEN
    SELECT true INTO _ok FROM public.holarchelp_ambulance_members
     WHERE provider_id = _provider_id AND user_id = _uid;
  END IF;
  IF NOT _ok THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.holarchelp_incidents
     SET destination_hospital_id = _hospital_id
   WHERE id = _incident_id;

  INSERT INTO public.holarchelp_incident_events (incident_id, event_type, actor_user_id, provider_id, payload)
  VALUES (_incident_id, 'destination_selected', _uid, _provider_id, jsonb_build_object('hospital_id', _hospital_id));

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.holarchelp_set_destination_hospital(uuid, uuid) TO authenticated;
