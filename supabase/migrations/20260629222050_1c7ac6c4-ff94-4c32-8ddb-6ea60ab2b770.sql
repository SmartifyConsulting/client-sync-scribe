
-- 1. Partner crew on a vehicle shift
CREATE TABLE public.paramedic_shift_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.paramedic_shifts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'partner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shift_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paramedic_shift_partners TO authenticated;
GRANT ALL ON public.paramedic_shift_partners TO service_role;

ALTER TABLE public.paramedic_shift_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select_visible"
  ON public.paramedic_shift_partners FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.paramedic_shifts s
      WHERE s.id = shift_id
        AND (s.user_id = auth.uid() OR public.is_ambulance_admin(s.provider_id, auth.uid()))
    )
    OR public.has_role(auth.uid(), 'admin'::user_role)
  );

CREATE POLICY "partners_insert_lead_or_admin"
  ON public.paramedic_shift_partners FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.paramedic_shifts s
      WHERE s.id = shift_id
        AND (s.user_id = auth.uid() OR public.is_ambulance_admin(s.provider_id, auth.uid()))
    )
  );

CREATE POLICY "partners_delete_lead_or_admin"
  ON public.paramedic_shift_partners FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.paramedic_shifts s
      WHERE s.id = shift_id
        AND (s.user_id = auth.uid() OR public.is_ambulance_admin(s.provider_id, auth.uid()))
    )
  );

-- 2. Dispatcher-on-duty flag on the provider
ALTER TABLE public.holarchelp_ambulance_providers
  ADD COLUMN IF NOT EXISTS dispatcher_on_duty boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatcher_on_duty_user_id uuid,
  ADD COLUMN IF NOT EXISTS dispatcher_on_duty_since timestamptz;

-- 3. RPC: dispatcher assigns a vehicle (shift) to an incident
CREATE OR REPLACE FUNCTION public.holarchelp_dispatcher_assign(
  _incident_id uuid,
  _shift_id uuid,
  _destination_hospital_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider uuid;
  v_lead uuid;
  v_ambulance uuid;
BEGIN
  SELECT provider_id, user_id, ambulance_id INTO v_provider, v_lead, v_ambulance
  FROM public.paramedic_shifts WHERE id = _shift_id AND ended_at IS NULL;
  IF v_provider IS NULL THEN RAISE EXCEPTION 'Shift not found or ended'; END IF;

  IF NOT (public.is_ambulance_admin(v_provider, auth.uid())
          OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_members
                     WHERE provider_id = v_provider AND user_id = auth.uid()
                       AND role IN ('dispatcher','admin','owner'))) THEN
    RAISE EXCEPTION 'Not authorized to dispatch for this provider';
  END IF;

  UPDATE public.paramedic_shifts
     SET status = 'busy', current_incident_id = _incident_id, updated_at = now()
   WHERE id = _shift_id;

  UPDATE public.holarchelp_incidents
     SET assigned_provider_id = v_provider,
         assigned_paramedic_user_id = v_lead,
         assigned_ambulance_id = v_ambulance,
         status = CASE WHEN status IN ('open','reopened') THEN 'assigned' ELSE status END,
         destination_hospital_id = COALESCE(_destination_hospital_id, destination_hospital_id),
         accepted_at = COALESCE(accepted_at, now()),
         updated_at = now()
   WHERE id = _incident_id;

  INSERT INTO public.holarchelp_incident_events (incident_id, actor_user_id, event_type, payload)
  VALUES (_incident_id, auth.uid(), 'dispatched',
          jsonb_build_object('shift_id', _shift_id, 'ambulance_id', v_ambulance, 'lead_user_id', v_lead));
END;
$$;

GRANT EXECUTE ON FUNCTION public.holarchelp_dispatcher_assign(uuid, uuid, uuid) TO authenticated;

-- 4. RPC: crew acknowledges a dispatcher-assigned incident
CREATE OR REPLACE FUNCTION public.holarchelp_crew_acknowledge(_incident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.holarchelp_incidents
     SET status = 'en_route', updated_at = now()
   WHERE id = _incident_id
     AND assigned_paramedic_user_id = auth.uid();

  IF NOT FOUND THEN RAISE EXCEPTION 'Incident not assigned to you'; END IF;

  INSERT INTO public.holarchelp_incident_events (incident_id, actor_user_id, event_type, payload)
  VALUES (_incident_id, auth.uid(), 'acknowledged', '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.holarchelp_crew_acknowledge(uuid) TO authenticated;

-- 5. RPC: toggle dispatcher-on-duty
CREATE OR REPLACE FUNCTION public.holarchelp_set_dispatcher_on_duty(
  _provider_id uuid,
  _on boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_ambulance_admin(_provider_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.holarchelp_ambulance_members
                     WHERE provider_id = _provider_id AND user_id = auth.uid()
                       AND role IN ('dispatcher','admin','owner'))) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.holarchelp_ambulance_providers
     SET dispatcher_on_duty = _on,
         dispatcher_on_duty_user_id = CASE WHEN _on THEN auth.uid() ELSE NULL END,
         dispatcher_on_duty_since   = CASE WHEN _on THEN now()      ELSE NULL END,
         updated_at = now()
   WHERE id = _provider_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.holarchelp_set_dispatcher_on_duty(uuid, boolean) TO authenticated;
