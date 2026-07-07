
CREATE OR REPLACE FUNCTION public.holarchelp_auto_assign_incident(_incident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _status text;
  _assigned uuid;
  _renken_id constant uuid := '121ae795-b2b1-4693-93bf-a2ba1dfdaeae';
  _renken_ok boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT status, assigned_provider_id INTO _status, _assigned
    FROM public.holarchelp_incidents WHERE id = _incident_id;
  IF _status IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;
  IF _assigned IS NOT NULL OR _status NOT IN ('open','reopened') THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'already_assigned');
  END IF;

  -- DEMO: insert a pending, priority-boosted offer for Renken and leave the
  -- incident 'open' so it shows in Renken's Incoming SOS queue.
  SELECT true INTO _renken_ok FROM public.holarchelp_ambulance_providers
    WHERE id = _renken_id AND status = 'approved'::holarchelp_provider_status;

  IF _renken_ok THEN
    INSERT INTO public.holarchelp_incident_offers
      (incident_id, provider_id, provider_kind, response, priority_boost, distance_km)
    VALUES
      (_incident_id, _renken_id, 'ambulance', 'pending', true, 0)
    ON CONFLICT (incident_id, provider_id) DO UPDATE
      SET response = 'pending',
          priority_boost = true,
          distance_km = 0,
          offered_at = now(),
          responded_at = NULL;

    INSERT INTO public.holarchelp_incident_events (incident_id, event_type, actor_user_id, payload)
    VALUES (_incident_id, 'auto_assigned', _uid,
            jsonb_build_object('demo', true, 'provider_id', _renken_id, 'mode', 'pending_offer'))
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('assigned', false, 'reason', 'demo_offered', 'provider_id', _renken_id);
  END IF;

  RETURN jsonb_build_object('assigned', false, 'reason', 'no_offers');
END;
$function$;

-- Fix the already-assigned incident so it appears in Renken's Incoming queue right now.
UPDATE public.holarchelp_incident_offers
   SET response = 'pending', priority_boost = true, distance_km = 0, responded_at = NULL, offered_at = now()
 WHERE incident_id = '80c28537-bed0-4835-8693-e8a8ddd965c6'
   AND provider_id = '121ae795-b2b1-4693-93bf-a2ba1dfdaeae';

UPDATE public.holarchelp_incidents
   SET assigned_provider_id = NULL,
       status = 'open',
       accepted_at = NULL
 WHERE id = '80c28537-bed0-4835-8693-e8a8ddd965c6'
   AND status = 'assigned';
