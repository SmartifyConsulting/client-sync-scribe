
-- 1. Provider staff can SELECT incidents where they have an offer (pending or otherwise)
CREATE POLICY "Provider staff read offered incidents"
ON public.holarchelp_incidents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.holarchelp_incident_offers o
    WHERE o.incident_id = holarchelp_incidents.id
      AND (
        public.is_ambulance_staff(o.provider_id, auth.uid())
        OR public.is_hospital_staff(o.provider_id, auth.uid())
      )
  )
);

-- 2. Dispatcher assigns an incident to a specific ambulance vehicle
CREATE OR REPLACE FUNCTION public.holarchelp_dispatcher_assign_vehicle(
  _incident_id uuid,
  _ambulance_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _provider uuid;
  _shift record;
  _status text;
  _assigned uuid;
  _updated uuid;
  _paramedic uuid;
  _member record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT provider_id INTO _provider FROM public.ambulances WHERE id = _ambulance_id;
  IF _provider IS NULL THEN RAISE EXCEPTION 'Vehicle not found'; END IF;

  IF NOT (public.is_ambulance_admin(_provider, _uid) OR public.has_role(_uid, 'admin'::user_role)) THEN
    RAISE EXCEPTION 'Not authorised to dispatch for this provider';
  END IF;

  SELECT status, assigned_provider_id INTO _status, _assigned
    FROM public.holarchelp_incidents WHERE id = _incident_id;
  IF _status IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;
  IF _assigned IS NOT NULL OR _status NOT IN ('open','reopened') THEN
    RAISE EXCEPTION 'Incident already assigned';
  END IF;

  -- Prefer an open shift on this vehicle
  SELECT id, user_id INTO _shift
    FROM public.paramedic_shifts
    WHERE ambulance_id = _ambulance_id AND ended_at IS NULL
    ORDER BY started_at DESC NULLS LAST
    LIMIT 1;
  _paramedic := _shift.user_id;

  UPDATE public.holarchelp_incidents
     SET assigned_provider_id = _provider,
         assigned_ambulance_id = _ambulance_id,
         assigned_paramedic_user_id = _paramedic,
         status = 'assigned',
         accepted_at = now()
   WHERE id = _incident_id
     AND assigned_provider_id IS NULL
     AND status IN ('open','reopened')
   RETURNING id INTO _updated;

  IF _updated IS NULL THEN RAISE EXCEPTION 'Incident already assigned'; END IF;

  UPDATE public.ambulances SET status = 'assigned' WHERE id = _ambulance_id;

  IF _shift.id IS NOT NULL THEN
    UPDATE public.paramedic_shifts SET status = 'busy' WHERE id = _shift.id;
  END IF;

  -- Accept our own offer, supersede others
  INSERT INTO public.holarchelp_incident_offers(incident_id, provider_id, provider_kind, response, responded_at)
    VALUES (_incident_id, _provider, 'ambulance', 'accepted', now())
    ON CONFLICT (incident_id, provider_id)
    DO UPDATE SET response = 'accepted', responded_at = now(), provider_kind = 'ambulance';
  UPDATE public.holarchelp_incident_offers
     SET response = 'superseded', responded_at = now()
   WHERE incident_id = _incident_id AND provider_id <> _provider AND response = 'pending';

  -- Notify paramedic (if any); otherwise page all active crew for this provider
  IF _paramedic IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, description, reference_id)
    VALUES (_paramedic, 'dispatch_assigned', 'You have been dispatched',
            'Dispatcher has assigned an SOS to your vehicle. Roll now.', _incident_id);
  ELSE
    FOR _member IN
      SELECT user_id FROM public.holarchelp_ambulance_members
      WHERE provider_id = _provider AND user_id IS NOT NULL AND status = 'active'
    LOOP
      INSERT INTO public.notifications(user_id, type, title, description, reference_id)
      VALUES (_member.user_id, 'dispatch_assigned', 'Crew paged for SOS',
              'Dispatcher assigned a vehicle to an SOS. No crew on shift — page the on-call team.', _incident_id);
    END LOOP;
  END IF;

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _provider, _uid, 'dispatcher_assigned',
            jsonb_build_object('ambulance_id', _ambulance_id, 'paramedic_user_id', _paramedic));

  RETURN jsonb_build_object('ok', true, 'ambulance_id', _ambulance_id, 'paramedic_user_id', _paramedic);
END $$;

GRANT EXECUTE ON FUNCTION public.holarchelp_dispatcher_assign_vehicle(uuid, uuid) TO authenticated;
