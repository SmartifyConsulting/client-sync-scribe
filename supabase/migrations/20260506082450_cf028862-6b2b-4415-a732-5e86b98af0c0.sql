
-- 1. Expand status lifecycle
ALTER TABLE public.holarchelp_incidents
  DROP CONSTRAINT IF EXISTS guardian_incidents_status_check;

UPDATE public.holarchelp_incidents SET status = 'open' WHERE status = 'active';
UPDATE public.holarchelp_incidents SET status = 'completed' WHERE status = 'resolved';

ALTER TABLE public.holarchelp_incidents
  ADD CONSTRAINT holarchelp_incidents_status_check
  CHECK (status IN ('open','assigned','en_route','arrived','patient_collected','at_hospital','completed','reopened','cancelled'));

ALTER TABLE public.holarchelp_incidents ALTER COLUMN status SET DEFAULT 'open';

-- 2. New columns
ALTER TABLE public.holarchelp_incidents
  ADD COLUMN IF NOT EXISTS destination_hospital_id uuid REFERENCES public.holarchelp_hospitals(id),
  ADD COLUMN IF NOT EXISTS provider_latitude double precision,
  ADD COLUMN IF NOT EXISTS provider_longitude double precision,
  ADD COLUMN IF NOT EXISTS provider_location_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS patient_collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS at_hospital_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 3. Helper: caller is staff of provider
CREATE OR REPLACE FUNCTION public.is_ambulance_staff(_provider_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.holarchelp_ambulance_providers WHERE id=_provider_id AND owner_id=_user_id)
      OR EXISTS(SELECT 1 FROM public.holarchelp_ambulance_members WHERE provider_id=_provider_id AND user_id=_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_hospital_staff(_hospital_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.holarchelp_hospitals WHERE id=_hospital_id AND owner_id=_user_id)
      OR EXISTS(SELECT 1 FROM public.holarchelp_hospital_members WHERE hospital_id=_hospital_id AND user_id=_user_id);
$$;

-- 4. First-accept lock
CREATE OR REPLACE FUNCTION public.holarchelp_accept_incident(_incident_id uuid, _provider_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _updated uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_ambulance_staff(_provider_id, _uid) THEN
    RAISE EXCEPTION 'Not authorised for this provider';
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
    RAISE EXCEPTION 'Incident already taken';
  END IF;

  INSERT INTO public.holarchelp_incident_offers(incident_id, provider_id, response, responded_at)
    VALUES (_incident_id, _provider_id, 'accepted', now())
    ON CONFLICT (incident_id, provider_id)
    DO UPDATE SET response='accepted', responded_at=now();

  UPDATE public.holarchelp_incident_offers
    SET response='superseded', responded_at=now()
    WHERE incident_id=_incident_id AND provider_id<>_provider_id AND response='pending';

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _provider_id, _uid, 'accepted', jsonb_build_object('provider_id', _provider_id));

  RETURN jsonb_build_object('locked', true, 'provider_id', _provider_id);
END $$;

-- 5. Release / reopen
CREATE OR REPLACE FUNCTION public.holarchelp_release_incident(_incident_id uuid, _reason text DEFAULT 'unable_to_continue')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _prev uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT assigned_provider_id INTO _prev FROM public.holarchelp_incidents WHERE id=_incident_id;
  IF _prev IS NULL THEN RAISE EXCEPTION 'No assignment to release'; END IF;
  IF NOT public.is_ambulance_staff(_prev, _uid) AND NOT public.has_role(_uid, 'admin'::user_role) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  UPDATE public.holarchelp_incidents
    SET assigned_provider_id = NULL,
        status='reopened',
        accepted_at=NULL,
        en_route_at=NULL,
        arrived_at=NULL,
        eta_minutes=NULL,
        provider_latitude=NULL,
        provider_longitude=NULL,
        provider_location_updated_at=NULL
    WHERE id=_incident_id;

  INSERT INTO public.holarchelp_incident_cancellations(incident_id, provider_id, reason_code, reason_text)
    VALUES (_incident_id, _prev, 'unable_to_continue', _reason);

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _prev, _uid, 'released', jsonb_build_object('reason', _reason));

  RETURN jsonb_build_object('released', true);
END $$;

-- 6. Status update helper
CREATE OR REPLACE FUNCTION public.holarchelp_set_incident_status(_incident_id uuid, _status text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _prov uuid;
  _now timestamptz := now();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT assigned_provider_id INTO _prov FROM public.holarchelp_incidents WHERE id=_incident_id;
  IF _prov IS NULL OR NOT public.is_ambulance_staff(_prov, _uid) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF _status NOT IN ('en_route','arrived','patient_collected','at_hospital','completed') THEN
    RAISE EXCEPTION 'Invalid status %', _status;
  END IF;

  UPDATE public.holarchelp_incidents SET
    status=_status,
    en_route_at = CASE WHEN _status='en_route' THEN _now ELSE en_route_at END,
    arrived_at = CASE WHEN _status='arrived' THEN _now ELSE arrived_at END,
    patient_collected_at = CASE WHEN _status='patient_collected' THEN _now ELSE patient_collected_at END,
    at_hospital_at = CASE WHEN _status='at_hospital' THEN _now ELSE at_hospital_at END,
    completed_at = CASE WHEN _status='completed' THEN _now ELSE completed_at END,
    resolved_at = CASE WHEN _status='completed' THEN _now ELSE resolved_at END
  WHERE id=_incident_id;

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _prov, _uid, _status, _payload);

  RETURN jsonb_build_object('ok', true);
END $$;

-- 7. Provider location ping
CREATE OR REPLACE FUNCTION public.holarchelp_update_provider_location(_incident_id uuid, _lat double precision, _lng double precision)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _prov uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT assigned_provider_id INTO _prov FROM public.holarchelp_incidents WHERE id=_incident_id;
  IF _prov IS NULL OR NOT public.is_ambulance_staff(_prov, _uid) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE public.holarchelp_incidents
    SET provider_latitude=_lat, provider_longitude=_lng, provider_location_updated_at=now()
    WHERE id=_incident_id;
END $$;

-- 8. Voice notes
CREATE TABLE IF NOT EXISTS public.holarchelp_voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.holarchelp_incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider_id uuid,
  audio_url text NOT NULL,
  duration_seconds numeric,
  transcript text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_holarchelp_voice_notes_incident ON public.holarchelp_voice_notes(incident_id, created_at DESC);
ALTER TABLE public.holarchelp_voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient reads incident voice notes" ON public.holarchelp_voice_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.holarchelp_incidents i WHERE i.id=incident_id AND i.user_id=auth.uid()));

CREATE POLICY "Assigned ambulance staff read voice notes" ON public.holarchelp_voice_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.holarchelp_incidents i WHERE i.id=incident_id AND i.assigned_provider_id IS NOT NULL AND public.is_ambulance_staff(i.assigned_provider_id, auth.uid())));

CREATE POLICY "Destination hospital staff read voice notes" ON public.holarchelp_voice_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.holarchelp_incidents i WHERE i.id=incident_id AND i.destination_hospital_id IS NOT NULL AND public.is_hospital_staff(i.destination_hospital_id, auth.uid())));

CREATE POLICY "Admins read voice notes" ON public.holarchelp_voice_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Patient inserts own voice note" ON public.holarchelp_voice_notes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.holarchelp_incidents i WHERE i.id=incident_id AND i.user_id=auth.uid()));

CREATE POLICY "Assigned ambulance staff insert voice note" ON public.holarchelp_voice_notes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.holarchelp_incidents i WHERE i.id=incident_id AND i.assigned_provider_id IS NOT NULL AND public.is_ambulance_staff(i.assigned_provider_id, auth.uid())));

CREATE POLICY "Destination hospital staff insert voice note" ON public.holarchelp_voice_notes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.holarchelp_incidents i WHERE i.id=incident_id AND i.destination_hospital_id IS NOT NULL AND public.is_hospital_staff(i.destination_hospital_id, auth.uid())));

ALTER PUBLICATION supabase_realtime ADD TABLE public.holarchelp_voice_notes;

-- 9. Hospital staff access to incident + events + locations
CREATE POLICY "Destination hospital staff read incident" ON public.holarchelp_incidents FOR SELECT TO authenticated
USING (destination_hospital_id IS NOT NULL AND public.is_hospital_staff(destination_hospital_id, auth.uid()));

CREATE POLICY "Destination hospital staff read events" ON public.holarchelp_incident_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.holarchelp_incidents i WHERE i.id=incident_id AND i.destination_hospital_id IS NOT NULL AND public.is_hospital_staff(i.destination_hospital_id, auth.uid())));

CREATE POLICY "Destination hospital staff read locations" ON public.holarchelp_locations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.holarchelp_incidents i WHERE i.id=incident_id AND i.destination_hospital_id IS NOT NULL AND public.is_hospital_staff(i.destination_hospital_id, auth.uid())));

-- 10. SOS triggered event on insert
CREATE OR REPLACE FUNCTION public.holarchelp_log_sos_triggered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.holarchelp_incident_events(incident_id, actor_user_id, event_type, payload)
    VALUES (NEW.id, NEW.user_id, 'sos_triggered', jsonb_build_object('severity', NEW.severity));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_holarchelp_log_sos_triggered ON public.holarchelp_incidents;
CREATE TRIGGER trg_holarchelp_log_sos_triggered
  AFTER INSERT ON public.holarchelp_incidents
  FOR EACH ROW EXECUTE FUNCTION public.holarchelp_log_sos_triggered();
