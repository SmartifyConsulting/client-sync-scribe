
-- ============================================================
-- Organization & Staff Refactor (paramedic-direct SOS)
-- ============================================================

-- 1. Ambulances table (individual vehicles)
CREATE TABLE IF NOT EXISTS public.ambulances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.holarchelp_ambulance_providers(id) ON DELETE CASCADE,
  vehicle_code text NOT NULL,
  registration_number text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','out_of_service')),
  current_latitude double precision,
  current_longitude double precision,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, vehicle_code)
);

ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amb_select_staff_admin" ON public.ambulances FOR SELECT TO authenticated
  USING (public.is_ambulance_staff(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));
CREATE POLICY "amb_insert_admin" ON public.ambulances FOR INSERT TO authenticated
  WITH CHECK (public.is_ambulance_admin(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));
CREATE POLICY "amb_update_admin" ON public.ambulances FOR UPDATE TO authenticated
  USING (public.is_ambulance_admin(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));
CREATE POLICY "amb_delete_admin" ON public.ambulances FOR DELETE TO authenticated
  USING (public.is_ambulance_admin(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));

CREATE TRIGGER trg_ambulances_updated_at BEFORE UPDATE ON public.ambulances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Incident additions: paramedic + ambulance link
ALTER TABLE public.holarchelp_incidents
  ADD COLUMN IF NOT EXISTS assigned_paramedic_user_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_ambulance_id uuid REFERENCES public.ambulances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_paramedic ON public.holarchelp_incidents(assigned_paramedic_user_id);

-- 3. Per-paramedic offers (extend offers table)
ALTER TABLE public.holarchelp_incident_offers
  ADD COLUMN IF NOT EXISTS paramedic_user_id uuid;
CREATE INDEX IF NOT EXISTS idx_offers_paramedic ON public.holarchelp_incident_offers(paramedic_user_id);

-- 4. Role helper functions
CREATE OR REPLACE FUNCTION public.is_paramedic(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.holarchelp_ambulance_members
    WHERE user_id = _user_id AND role = 'paramedic'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_hospital_role(_hospital_id uuid, _user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.holarchelp_hospital_members
    WHERE hospital_id = _hospital_id AND user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_ambulance_role(_provider_id uuid, _user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.holarchelp_ambulance_members
    WHERE provider_id = _provider_id AND user_id = _user_id AND role = _role
  );
$$;

-- Update admin helpers to accept new role name
CREATE OR REPLACE FUNCTION public.is_hospital_admin(_hospital_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.holarchelp_hospitals WHERE id=_hospital_id AND owner_id=_user_id)
      OR EXISTS(SELECT 1 FROM public.holarchelp_hospital_members
                 WHERE hospital_id=_hospital_id AND user_id=_user_id AND role IN ('admin','hospital_admin'));
$$;

CREATE OR REPLACE FUNCTION public.is_ambulance_admin(_provider_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.holarchelp_ambulance_providers WHERE id=_provider_id AND owner_id=_user_id)
      OR EXISTS(SELECT 1 FROM public.holarchelp_ambulance_members
                 WHERE provider_id=_provider_id AND user_id=_user_id AND role IN ('admin','er_admin'));
$$;

-- 5. Paramedic-direct accept RPC
CREATE OR REPLACE FUNCTION public.holarchelp_paramedic_accept(
  _incident_id uuid, _ambulance_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _provider_id uuid;
  _updated uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- find paramedic's provider; require ambulance belongs to same provider
  SELECT a.provider_id INTO _provider_id
    FROM public.ambulances a
    JOIN public.holarchelp_ambulance_members m
      ON m.provider_id = a.provider_id AND m.user_id = _uid AND m.role = 'paramedic'
   WHERE a.id = _ambulance_id;

  IF _provider_id IS NULL THEN
    RAISE EXCEPTION 'Not a paramedic for this ambulance';
  END IF;

  UPDATE public.holarchelp_incidents
    SET assigned_provider_id = _provider_id,
        assigned_paramedic_user_id = _uid,
        assigned_ambulance_id = _ambulance_id,
        status = 'assigned',
        accepted_at = now()
    WHERE id = _incident_id
      AND assigned_paramedic_user_id IS NULL
      AND status IN ('open','reopened')
    RETURNING id INTO _updated;

  IF _updated IS NULL THEN
    RAISE EXCEPTION 'Incident already taken';
  END IF;

  UPDATE public.ambulances SET status='assigned' WHERE id = _ambulance_id;

  INSERT INTO public.holarchelp_incident_offers(incident_id, provider_id, paramedic_user_id, response, responded_at)
    VALUES (_incident_id, _provider_id, _uid, 'accepted', now())
    ON CONFLICT (incident_id, provider_id) DO UPDATE
      SET response='accepted', responded_at=now(), paramedic_user_id=EXCLUDED.paramedic_user_id;

  UPDATE public.holarchelp_incident_offers
    SET response='superseded', responded_at=now()
    WHERE incident_id=_incident_id AND response='pending'
      AND (provider_id<>_provider_id OR paramedic_user_id<>_uid);

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _provider_id, _uid, 'paramedic_accepted',
            jsonb_build_object('paramedic_user_id', _uid, 'ambulance_id', _ambulance_id));

  RETURN jsonb_build_object('locked', true, 'provider_id', _provider_id, 'ambulance_id', _ambulance_id);
END $$;

-- 6. Update set_incident_status: only assigned paramedic OR ER admin can change
CREATE OR REPLACE FUNCTION public.holarchelp_set_incident_status(_incident_id uuid, _status text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF _status='completed' AND _amb IS NOT NULL THEN
    UPDATE public.ambulances SET status='available' WHERE id=_amb;
  END IF;

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _prov, _uid, _status, _payload);

  RETURN jsonb_build_object('ok', true);
END $$;

-- 7. Release: also free ambulance
CREATE OR REPLACE FUNCTION public.holarchelp_release_incident(_incident_id uuid, _reason text DEFAULT 'unable_to_continue')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _prev uuid; _amb uuid; _para uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT assigned_provider_id, assigned_ambulance_id, assigned_paramedic_user_id
    INTO _prev, _amb, _para FROM public.holarchelp_incidents WHERE id=_incident_id;
  IF _prev IS NULL THEN RAISE EXCEPTION 'No assignment to release'; END IF;
  IF NOT (_para = _uid OR public.is_ambulance_admin(_prev, _uid) OR public.has_role(_uid,'admin'::user_role)) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  UPDATE public.holarchelp_incidents
    SET assigned_provider_id=NULL, assigned_paramedic_user_id=NULL, assigned_ambulance_id=NULL,
        status='reopened', accepted_at=NULL, en_route_at=NULL, arrived_at=NULL,
        eta_minutes=NULL, provider_latitude=NULL, provider_longitude=NULL,
        provider_location_updated_at=NULL
    WHERE id=_incident_id;

  IF _amb IS NOT NULL THEN UPDATE public.ambulances SET status='available' WHERE id=_amb; END IF;

  INSERT INTO public.holarchelp_incident_cancellations(incident_id, provider_id, reason_code, reason_text)
    VALUES (_incident_id, _prev, 'unable_to_continue', _reason);
  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _prev, _uid, 'released', jsonb_build_object('reason', _reason));

  RETURN jsonb_build_object('released', true);
END $$;

-- 8. Data backfill: migrate existing roles
UPDATE public.holarchelp_ambulance_members SET role='paramedic' WHERE role IN ('crew','member');
UPDATE public.holarchelp_ambulance_members SET role='er_admin' WHERE role='admin';
UPDATE public.holarchelp_hospital_members SET role='hospital_admin' WHERE role='admin';
UPDATE public.holarchelp_hospital_members SET role='nurse' WHERE role='staff';

-- Owners become admins of their org (idempotent)
INSERT INTO public.holarchelp_ambulance_members (provider_id, user_id, role, accepted_at)
  SELECT id, owner_id, 'er_admin', now() FROM public.holarchelp_ambulance_providers
  WHERE owner_id IS NOT NULL
  ON CONFLICT (provider_id, user_id) DO UPDATE SET role='er_admin', accepted_at=COALESCE(holarchelp_ambulance_members.accepted_at, now());

INSERT INTO public.holarchelp_hospital_members (hospital_id, user_id, role, accepted_at)
  SELECT id, owner_id, 'hospital_admin', now() FROM public.holarchelp_hospitals
  WHERE owner_id IS NOT NULL
  ON CONFLICT (hospital_id, user_id) DO UPDATE SET role='hospital_admin', accepted_at=COALESCE(holarchelp_hospital_members.accepted_at, now());

-- Ensure Eldette 911 (Eldette user) is a paramedic of Eldette 911 provider
DO $$
DECLARE _prov uuid; _user uuid;
BEGIN
  SELECT id, owner_id INTO _prov, _user FROM public.holarchelp_ambulance_providers
    WHERE company_name ILIKE 'Eldette 911' LIMIT 1;
  IF _prov IS NOT NULL AND _user IS NOT NULL THEN
    INSERT INTO public.holarchelp_ambulance_members (provider_id, user_id, role, accepted_at)
      VALUES (_prov, _user, 'paramedic', now())
      ON CONFLICT (provider_id, user_id) DO UPDATE SET role='paramedic', accepted_at=COALESCE(holarchelp_ambulance_members.accepted_at, now());
    -- Seed one ambulance for Eldette 911 if none exist
    IF NOT EXISTS (SELECT 1 FROM public.ambulances WHERE provider_id = _prov) THEN
      INSERT INTO public.ambulances (provider_id, vehicle_code, registration_number, status)
        VALUES (_prov, 'ELD-01', 'GP-ELDETTE-01', 'available');
    END IF;
  END IF;
END $$;
