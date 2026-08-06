-- Ward transfers now tag the admission's status as 'transferred' (in addition
-- to 'admitted' / 'discharged') so the Inpatients tab can offer an
-- Admitted | Discharged | Transferred filter chip set.
CREATE OR REPLACE FUNCTION public.hospital_transfer_patient(_admission_id uuid, _to_ward_id uuid, _to_bed text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _a public.hospital_inpatient_admissions; _name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _a FROM public.hospital_inpatient_admissions WHERE id = _admission_id;
  IF _a.id IS NULL THEN RAISE EXCEPTION 'Admission not found'; END IF;
  IF NOT (public.is_hospital_staff(_a.hospital_id, _uid) OR public.has_role(_uid,'admin'::user_role)) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT full_name INTO _name FROM public.profiles WHERE id = _uid;

  INSERT INTO public.hospital_ward_transfers(admission_id, from_ward_id, to_ward_id, from_bed_number, to_bed_number, reason, moved_by, moved_by_name)
  VALUES (_admission_id, _a.ward_id, _to_ward_id, _a.bed_number, _to_bed, _reason, _uid, COALESCE(_name,'Hospital staff'));

  UPDATE public.hospital_inpatient_admissions
    SET ward_id = _to_ward_id, bed_number = _to_bed, status = 'transferred'
    WHERE id = _admission_id;

  RETURN jsonb_build_object('ok', true);
END $$;
