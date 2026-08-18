CREATE OR REPLACE FUNCTION public.hospital_shift_clock(_shift_id uuid, _action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s public.hospital_staff_shifts; _closed int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _s FROM public.hospital_staff_shifts WHERE id = _shift_id;
  IF _s.id IS NULL THEN RAISE EXCEPTION 'Shift not found'; END IF;

  IF NOT (
    _s.doctor_id = _uid
    OR EXISTS (SELECT 1 FROM public.hospital_nurses n WHERE n.id = _s.nurse_id AND n.linked_user_id = _uid)
    OR public.is_hospital_admin(_s.hospital_id, _uid)
    OR public.has_role(_uid, 'admin'::user_role)
  ) THEN
    RAISE EXCEPTION 'Not authorised for this shift';
  END IF;

  IF _action = 'in' THEN
    IF _s.clocked_in_at IS NOT NULL AND _s.clocked_out_at IS NULL THEN
      RAISE EXCEPTION 'Already clocked in';
    END IF;

    -- A person can only be on one shift at a time: auto-close any other open shift.
    UPDATE public.hospital_staff_shifts o
      SET clocked_out_at = now(), status = 'completed'
      WHERE o.id <> _shift_id
        AND o.clocked_in_at IS NOT NULL AND o.clocked_out_at IS NULL
        AND ((o.doctor_id IS NOT NULL AND o.doctor_id = _s.doctor_id)
          OR (o.nurse_id IS NOT NULL AND o.nurse_id = _s.nurse_id));
    GET DIAGNOSTICS _closed = ROW_COUNT;

    UPDATE public.hospital_staff_shifts
      SET clocked_in_at = now(), clocked_out_at = NULL, status = 'on_shift' WHERE id = _shift_id;
  ELSIF _action = 'out' THEN
    IF _s.clocked_in_at IS NULL THEN RAISE EXCEPTION 'Not clocked in'; END IF;
    UPDATE public.hospital_staff_shifts
      SET clocked_out_at = now(), status = 'completed' WHERE id = _shift_id;
  ELSE
    RAISE EXCEPTION 'Invalid action %', _action;
  END IF;

  RETURN jsonb_build_object('ok', true, 'shift_id', _shift_id, 'action', _action, 'auto_closed', _closed);
END $$;