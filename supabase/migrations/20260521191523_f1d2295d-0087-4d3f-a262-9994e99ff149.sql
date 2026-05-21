
-- 1. paramedic_shifts table
CREATE TABLE public.paramedic_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.holarchelp_ambulance_providers(id) ON DELETE CASCADE,
  ambulance_id uuid NOT NULL REFERENCES public.ambulances(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','busy','off_shift')),
  current_incident_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX paramedic_shifts_one_open_per_user
  ON public.paramedic_shifts(user_id) WHERE ended_at IS NULL;

CREATE INDEX paramedic_shifts_provider_open
  ON public.paramedic_shifts(provider_id) WHERE ended_at IS NULL;

CREATE TRIGGER trg_paramedic_shifts_updated_at
BEFORE UPDATE ON public.paramedic_shifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.paramedic_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_select_self_or_admin" ON public.paramedic_shifts
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_ambulance_admin(provider_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::user_role)
  );

CREATE POLICY "shift_insert_self" ON public.paramedic_shifts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "shift_update_self_or_admin" ON public.paramedic_shifts
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_ambulance_admin(provider_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::user_role)
  );

-- 2. Start shift RPC
CREATE OR REPLACE FUNCTION public.holarchelp_start_shift(_ambulance_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _provider_id uuid;
  _amb_status text;
  _shift_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT a.provider_id, a.status INTO _provider_id, _amb_status
    FROM public.ambulances a
    JOIN public.holarchelp_ambulance_members m
      ON m.provider_id = a.provider_id AND m.user_id = _uid AND m.role = 'paramedic'
   WHERE a.id = _ambulance_id;

  IF _provider_id IS NULL THEN
    RAISE EXCEPTION 'Not a paramedic for this ambulance';
  END IF;

  IF _amb_status <> 'available' THEN
    RAISE EXCEPTION 'Ambulance is not available';
  END IF;

  IF EXISTS (SELECT 1 FROM public.paramedic_shifts WHERE user_id = _uid AND ended_at IS NULL) THEN
    RAISE EXCEPTION 'You already have an open shift';
  END IF;

  INSERT INTO public.paramedic_shifts(user_id, provider_id, ambulance_id, status)
    VALUES (_uid, _provider_id, _ambulance_id, 'available')
    RETURNING id INTO _shift_id;

  RETURN jsonb_build_object('shift_id', _shift_id, 'provider_id', _provider_id, 'ambulance_id', _ambulance_id);
END $$;

-- 3. End shift RPC
CREATE OR REPLACE FUNCTION public.holarchelp_end_shift()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _shift public.paramedic_shifts;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _shift FROM public.paramedic_shifts
    WHERE user_id = _uid AND ended_at IS NULL FOR UPDATE;
  IF _shift.id IS NULL THEN RAISE EXCEPTION 'No open shift'; END IF;
  IF _shift.status = 'busy' THEN RAISE EXCEPTION 'Finish your active incident first'; END IF;

  UPDATE public.paramedic_shifts
    SET ended_at = now(), status = 'off_shift'
    WHERE id = _shift.id;

  RETURN jsonb_build_object('ended', true);
END $$;

-- 4. Update paramedic accept to require an open shift on the chosen ambulance and flip shift to busy
CREATE OR REPLACE FUNCTION public.holarchelp_paramedic_accept(_incident_id uuid, _ambulance_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _provider_id uuid;
  _shift_id uuid;
  _updated uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT s.id, s.provider_id INTO _shift_id, _provider_id
    FROM public.paramedic_shifts s
   WHERE s.user_id = _uid
     AND s.ambulance_id = _ambulance_id
     AND s.ended_at IS NULL
     AND s.status = 'available'
   FOR UPDATE;

  IF _shift_id IS NULL THEN
    RAISE EXCEPTION 'You must start a shift with this ambulance and be available';
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

  UPDATE public.ambulances SET status = 'assigned' WHERE id = _ambulance_id;

  UPDATE public.paramedic_shifts
    SET status = 'busy', current_incident_id = _incident_id
    WHERE id = _shift_id;

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
            jsonb_build_object('paramedic_user_id', _uid, 'ambulance_id', _ambulance_id, 'shift_id', _shift_id));

  RETURN jsonb_build_object('locked', true, 'provider_id', _provider_id, 'ambulance_id', _ambulance_id);
END $$;

-- 5. Auto-release on terminal incident status
CREATE OR REPLACE FUNCTION public.holarchelp_release_on_terminal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('completed','cancelled','resolved','closed')
     AND OLD.assigned_paramedic_user_id IS NOT NULL THEN

    UPDATE public.paramedic_shifts
      SET status = 'available', current_incident_id = NULL
      WHERE user_id = OLD.assigned_paramedic_user_id
        AND ended_at IS NULL
        AND current_incident_id = NEW.id;

    IF OLD.assigned_ambulance_id IS NOT NULL THEN
      UPDATE public.ambulances SET status = 'available'
        WHERE id = OLD.assigned_ambulance_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_holarchelp_release_on_terminal ON public.holarchelp_incidents;
CREATE TRIGGER trg_holarchelp_release_on_terminal
AFTER UPDATE ON public.holarchelp_incidents
FOR EACH ROW EXECUTE FUNCTION public.holarchelp_release_on_terminal();

-- 6. Eligible paramedics helper (used by dispatcher)
CREATE OR REPLACE FUNCTION public.holarchelp_eligible_paramedics(_provider_ids uuid[])
RETURNS TABLE(provider_id uuid, user_id uuid, ambulance_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.provider_id, s.user_id, s.ambulance_id
  FROM public.paramedic_shifts s
  WHERE s.ended_at IS NULL
    AND s.status = 'available'
    AND s.provider_id = ANY(_provider_ids);
$$;
