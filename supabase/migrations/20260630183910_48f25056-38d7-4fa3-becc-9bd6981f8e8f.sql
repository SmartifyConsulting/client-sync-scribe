
-- 1) Fix the emergency patient context RPC to source patient fields from public.patients
CREATE OR REPLACE FUNCTION public.get_emergency_patient_context(_incident_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _incident public.holarchelp_incidents;
  _allowed boolean := false;
  _patient_id uuid;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _incident FROM public.holarchelp_incidents WHERE id = _incident_id;
  IF _incident.id IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;

  IF public.has_role(_uid, 'admin'::user_role) THEN _allowed := true; END IF;
  IF NOT _allowed AND _incident.assigned_provider_id IS NOT NULL
     AND public.is_ambulance_staff(_incident.assigned_provider_id, _uid) THEN _allowed := true; END IF;
  IF NOT _allowed AND _incident.destination_hospital_id IS NOT NULL
     AND public.is_hospital_staff(_incident.destination_hospital_id, _uid) THEN _allowed := true; END IF;
  IF NOT _allowed THEN RAISE EXCEPTION 'Not authorised'; END IF;

  SELECT id INTO _patient_id FROM public.patients
    WHERE patient_user_id = _incident.user_id
    ORDER BY created_at LIMIT 1;

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
        'full_name',          (SELECT full_name FROM public.profiles WHERE id = _incident.user_id),
        'mobile_number',      (SELECT mobile_number FROM public.profiles WHERE id = _incident.user_id),
        'preferred_language', (SELECT preferred_language FROM public.profiles WHERE id = _incident.user_id),
        'date_of_birth',      (SELECT dob::text FROM public.patients WHERE id = _patient_id),
        'gender',             (SELECT gender FROM public.patients WHERE id = _patient_id),
        'blood_type',         (SELECT blood_type FROM public.patients WHERE id = _patient_id),
        'allergies',          (SELECT allergies FROM public.patients WHERE id = _patient_id),
        'chronic_conditions', (SELECT conditions_diagnoses FROM public.patients WHERE id = _patient_id)
    ),
    'medications', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('medication', medication, 'dosage', dosage, 'frequency', frequency) ORDER BY created_at DESC)
      FROM public.prescriptions WHERE patient_id = _patient_id AND COALESCE(status,'active') = 'active'
    ), '[]'::jsonb),
    'emergency_contacts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'phone', phone, 'relationship', relationship))
      FROM public.holarchelp_emergency_contacts WHERE user_id = _incident.user_id
    ), '[]'::jsonb),
    'voice_note_url', _incident.voice_note_audio_url,
    'voice_note_transcript', _incident.voice_note_transcript,
    'ai_summary', _incident.ai_emergency_summary,
    'severity', _incident.severity,
    'conscious', _incident.conscious,
    'breathing', _incident.breathing,
    'notes', _incident.notes,
    'linked_providers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', pr.full_name, 'specialty', pr.specialty))
      FROM public.doctor_patient_access dpa
      JOIN public.profiles pr ON pr.id = dpa.doctor_id
      WHERE dpa.patient_user_id = _incident.user_id AND dpa.is_active = true
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END $function$;


-- 2) Allow 'treated_on_scene' and 'en_route_to_hospital' in the set_incident_status RPC
CREATE OR REPLACE FUNCTION public.holarchelp_set_incident_status(_incident_id uuid, _status text, _payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _prov uuid; _para uuid; _amb uuid; _now timestamptz := now();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT assigned_provider_id, assigned_paramedic_user_id, assigned_ambulance_id
    INTO _prov, _para, _amb FROM public.holarchelp_incidents WHERE id=_incident_id;
  IF _prov IS NULL THEN RAISE EXCEPTION 'No assignment'; END IF;
  IF NOT (_para = _uid OR public.is_ambulance_admin(_prov, _uid) OR public.has_role(_uid,'admin'::user_role)) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF _status NOT IN ('en_route','arrived','patient_collected','en_route_to_hospital','at_hospital','completed','treated_on_scene') THEN
    RAISE EXCEPTION 'Invalid status %', _status;
  END IF;

  UPDATE public.holarchelp_incidents SET
    status=_status,
    en_route_at = CASE WHEN _status='en_route' THEN _now ELSE en_route_at END,
    arrived_at = CASE WHEN _status='arrived' THEN _now ELSE arrived_at END,
    patient_collected_at = CASE WHEN _status IN ('patient_collected','en_route_to_hospital') THEN COALESCE(patient_collected_at, _now) ELSE patient_collected_at END,
    at_hospital_at = CASE WHEN _status='at_hospital' THEN _now ELSE at_hospital_at END,
    completed_at = CASE WHEN _status IN ('completed','treated_on_scene') THEN _now ELSE completed_at END,
    resolved_at = CASE WHEN _status IN ('completed','treated_on_scene') THEN _now ELSE resolved_at END
  WHERE id=_incident_id;

  IF _status IN ('completed','treated_on_scene') AND _amb IS NOT NULL THEN
    UPDATE public.ambulances SET status='available' WHERE id=_amb;
  END IF;

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _prov, _uid, _status, _payload);

  RETURN jsonb_build_object('ok', true);
END $function$;


-- 3) Cancel-on-scene RPC: patient treated at the scene, no transport
CREATE OR REPLACE FUNCTION public.holarchelp_cancel_transport(_incident_id uuid, _reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _prov uuid; _para uuid; _amb uuid; _now timestamptz := now();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT assigned_provider_id, assigned_paramedic_user_id, assigned_ambulance_id
    INTO _prov, _para, _amb FROM public.holarchelp_incidents WHERE id=_incident_id;
  IF _prov IS NULL THEN RAISE EXCEPTION 'No assignment'; END IF;
  IF NOT (_para = _uid OR public.is_ambulance_admin(_prov, _uid) OR public.has_role(_uid,'admin'::user_role)) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  UPDATE public.holarchelp_incidents SET
    status='treated_on_scene',
    resolved_at=_now,
    completed_at=_now
  WHERE id=_incident_id;

  IF _amb IS NOT NULL THEN UPDATE public.ambulances SET status='available' WHERE id=_amb; END IF;

  INSERT INTO public.holarchelp_incident_cancellations(incident_id, provider_id, reason_code, reason_text)
    VALUES (_incident_id, _prov, 'treated_on_scene', COALESCE(_reason, 'Patient treated at the scene; transport not required'));

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _prov, _uid, 'treated_on_scene',
            jsonb_build_object('reason', COALESCE(_reason,'Patient treated at the scene')));

  RETURN jsonb_build_object('ok', true);
END $function$;


-- 4) Haversine helper
CREATE OR REPLACE FUNCTION public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision
LANGUAGE sql IMMUTABLE
AS $$
  SELECT 2 * 6371 * asin( sqrt(
    sin(radians((lat2-lat1)/2))^2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians((lng2-lng1)/2))^2
  ) );
$$;


-- 5) Auto-advance trigger on new provider location pings
CREATE OR REPLACE FUNCTION public.holarchelp_auto_advance_from_ping()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _inc public.holarchelp_incidents;
  _h_lat double precision; _h_lng double precision;
  _new_status text; _now timestamptz := now();
  _last_two_speeds double precision[];
  _avg_recent_speed double precision;
  _dist_to_hospital double precision;
  _last_dist_to_hospital double precision;
  _prev_dist double precision;
BEGIN
  IF NEW.incident_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO _inc FROM public.holarchelp_incidents WHERE id = NEW.incident_id;
  IF _inc.id IS NULL THEN RETURN NEW; END IF;
  IF _inc.status NOT IN ('assigned','en_route','arrived','patient_collected','en_route_to_hospital') THEN
    RETURN NEW;
  END IF;

  -- Forward-only transitions
  IF _inc.status = 'assigned' AND COALESCE(NEW.speed,0) > 2 THEN
    _new_status := 'en_route';
  ELSIF _inc.status = 'en_route' THEN
    -- "Arrived" inferred when the vehicle stops after moving
    SELECT array_agg(speed ORDER BY recorded_at DESC) INTO _last_two_speeds
      FROM (SELECT speed FROM public.holarchelp_provider_locations
              WHERE incident_id = NEW.incident_id ORDER BY recorded_at DESC LIMIT 3) s;
    IF COALESCE(NEW.speed,0) < 1
       AND _inc.en_route_at IS NOT NULL
       AND _now - _inc.en_route_at > interval '20 seconds' THEN
      _new_status := 'arrived';
    END IF;
  ELSIF _inc.status = 'arrived' AND COALESCE(NEW.speed,0) > 2
        AND _inc.arrived_at IS NOT NULL
        AND _now - _inc.arrived_at > interval '20 seconds' THEN
    _new_status := 'en_route_to_hospital';
  ELSIF _inc.status IN ('patient_collected','en_route_to_hospital')
        AND _inc.destination_hospital_id IS NOT NULL THEN
    SELECT latitude, longitude INTO _h_lat, _h_lng
      FROM public.holarchelp_hospitals WHERE id = _inc.destination_hospital_id;
    IF _h_lat IS NOT NULL THEN
      _dist_to_hospital := public.haversine_km(NEW.latitude, NEW.longitude, _h_lat, _h_lng);
      IF _dist_to_hospital < 0.15 AND COALESCE(NEW.speed,0) < 2 THEN
        _new_status := 'at_hospital';
      ELSE
        -- Course-deviation: distance increased vs the previous ping
        SELECT public.haversine_km(latitude, longitude, _h_lat, _h_lng) INTO _prev_dist
          FROM public.holarchelp_provider_locations
          WHERE incident_id = NEW.incident_id AND id <> NEW.id
          ORDER BY recorded_at DESC LIMIT 1;
        IF _prev_dist IS NOT NULL AND _dist_to_hospital > _prev_dist + 0.1 THEN
          INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, event_type, payload)
            VALUES (NEW.incident_id, _inc.assigned_provider_id, 'route_deviation',
                    jsonb_build_object('dist_km', _dist_to_hospital, 'prev_dist_km', _prev_dist));
        END IF;
      END IF;
    END IF;
  END IF;

  IF _new_status IS NOT NULL AND _new_status <> _inc.status THEN
    UPDATE public.holarchelp_incidents SET
      status = _new_status,
      en_route_at = CASE WHEN _new_status='en_route' THEN COALESCE(en_route_at, _now) ELSE en_route_at END,
      arrived_at  = CASE WHEN _new_status='arrived'  THEN COALESCE(arrived_at, _now)  ELSE arrived_at END,
      patient_collected_at = CASE WHEN _new_status='en_route_to_hospital' THEN COALESCE(patient_collected_at, _now) ELSE patient_collected_at END,
      at_hospital_at = CASE WHEN _new_status='at_hospital' THEN COALESCE(at_hospital_at, _now) ELSE at_hospital_at END,
      provider_latitude = NEW.latitude,
      provider_longitude = NEW.longitude,
      provider_location_updated_at = _now
    WHERE id = NEW.incident_id;

    INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, event_type, payload)
      VALUES (NEW.incident_id, _inc.assigned_provider_id, _new_status,
              jsonb_build_object('auto', true, 'lat', NEW.latitude, 'lng', NEW.longitude, 'speed', NEW.speed));
  END IF;

  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_holarchelp_auto_advance ON public.holarchelp_provider_locations;
CREATE TRIGGER trg_holarchelp_auto_advance
  AFTER INSERT ON public.holarchelp_provider_locations
  FOR EACH ROW EXECUTE FUNCTION public.holarchelp_auto_advance_from_ping();
