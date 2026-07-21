
-- Crew↔Vehicle assignments
CREATE TABLE public.ambulance_crew_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambulance_id uuid NOT NULL REFERENCES public.ambulances(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.holarchelp_ambulance_members(id) ON DELETE CASCADE,
  is_default_lead boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ambulance_id, member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ambulance_crew_assignments TO authenticated;
GRANT ALL ON public.ambulance_crew_assignments TO service_role;

ALTER TABLE public.ambulance_crew_assignments ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user a manager/admin/owner for the provider that owns this ambulance?
CREATE OR REPLACE FUNCTION public._is_amb_provider_admin_for_vehicle(_ambulance_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ambulances a
    JOIN public.holarchelp_ambulance_members m
      ON m.provider_id = a.provider_id
     AND m.user_id = auth.uid()
     AND m.status = 'active'
     AND lower(m.role) IN ('admin','owner','manager','er_admin')
    WHERE a.id = _ambulance_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.ambulances a
    JOIN public.holarchelp_ambulance_providers p ON p.id = a.provider_id
    WHERE a.id = _ambulance_id AND p.owner_id = auth.uid()
  );
$$;

CREATE POLICY "aca_select_provider_member"
  ON public.ambulance_crew_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ambulances a
      JOIN public.holarchelp_ambulance_members m
        ON m.provider_id = a.provider_id AND m.user_id = auth.uid() AND m.status='active'
      WHERE a.id = ambulance_crew_assignments.ambulance_id
    )
    OR EXISTS (
      SELECT 1 FROM public.ambulances a
      JOIN public.holarchelp_ambulance_providers p ON p.id = a.provider_id
      WHERE a.id = ambulance_crew_assignments.ambulance_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "aca_write_admin"
  ON public.ambulance_crew_assignments
  FOR ALL TO authenticated
  USING (public._is_amb_provider_admin_for_vehicle(ambulance_id))
  WITH CHECK (public._is_amb_provider_admin_for_vehicle(ambulance_id));

-- Bulk start-shifts RPC
CREATE OR REPLACE FUNCTION public.holarchelp_start_shifts_bulk(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entry jsonb;
  _ambulance_id uuid;
  _lead uuid;
  _partners jsonb;
  _provider uuid;
  _shift_id uuid;
  _created jsonb := '[]'::jsonb;
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR _entry IN SELECT * FROM jsonb_array_elements(_payload->'selections')
  LOOP
    _ambulance_id := (_entry->>'ambulance_id')::uuid;
    _lead := COALESCE((_entry->>'lead_user_id')::uuid, _caller);
    _partners := COALESCE(_entry->'partner_user_ids', '[]'::jsonb);

    SELECT provider_id INTO _provider FROM public.ambulances WHERE id = _ambulance_id;
    IF _provider IS NULL THEN
      RAISE EXCEPTION 'Vehicle not found';
    END IF;

    -- Caller must be a member or owner of this provider
    IF NOT EXISTS (
      SELECT 1 FROM public.holarchelp_ambulance_members
       WHERE provider_id = _provider AND user_id = _caller AND status='active'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.holarchelp_ambulance_providers WHERE id = _provider AND owner_id = _caller
    ) THEN
      RAISE EXCEPTION 'Not authorised for this provider';
    END IF;

    -- No open shift for the chosen lead
    IF EXISTS (SELECT 1 FROM public.paramedic_shifts WHERE user_id = _lead AND ended_at IS NULL) THEN
      RAISE EXCEPTION 'Lead user already has an open shift';
    END IF;

    -- Vehicle must be available
    IF NOT EXISTS (SELECT 1 FROM public.ambulances WHERE id = _ambulance_id AND status = 'available') THEN
      RAISE EXCEPTION 'Vehicle is not available';
    END IF;

    INSERT INTO public.paramedic_shifts(user_id, provider_id, ambulance_id, status)
    VALUES (_lead, _provider, _ambulance_id, 'available')
    RETURNING id INTO _shift_id;

    -- Mark vehicle busy/in-use → keep schema-compatible: leave as-is (existing single start RPC does too)

    IF jsonb_array_length(_partners) > 0 THEN
      INSERT INTO public.paramedic_shift_partners (shift_id, user_id, role)
      SELECT _shift_id, (p)::uuid, 'partner'
      FROM jsonb_array_elements_text(_partners) AS p;
    END IF;

    _created := _created || jsonb_build_object('shift_id', _shift_id, 'ambulance_id', _ambulance_id);
  END LOOP;

  RETURN jsonb_build_object('created', _created);
END;
$$;

GRANT EXECUTE ON FUNCTION public.holarchelp_start_shifts_bulk(jsonb) TO authenticated;
