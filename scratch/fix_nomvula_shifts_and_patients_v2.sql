-- Run manually in the Supabase SQL editor.
--
-- Nomvula Dlamini's nurse row is confirmed:
--   id          = bd493577-03a3-4a97-a1f3-38c4109e5ed6
--   hospital_id = 217bbf9f-bca8-42de-9d86-4a7f1b03488e
--   ward_id     = a0000000-0000-4000-8000-000000000002   (already set)
--
-- This script only tops up shifts and admitted patients for that exact ward —
-- no name-based lookups, so it can't silently miss again. Idempotent/safe to
-- re-run.

DO $$
DECLARE
  v_hospital_id uuid := '217bbf9f-bca8-42de-9d86-4a7f1b03488e';
  v_ward_id uuid := 'a0000000-0000-4000-8000-000000000002';
  v_nurse_id uuid := 'bd493577-03a3-4a97-a1f3-38c4109e5ed6';
  v_shift_count int;
  v_admitted_count int;
BEGIN
  -- Shifts — only top up if she currently has none.
  SELECT count(*) INTO v_shift_count FROM public.hospital_staff_shifts WHERE nurse_id = v_nurse_id;
  IF v_shift_count = 0 THEN
    INSERT INTO public.hospital_staff_shifts
      (hospital_id, ward_id, staff_role, nurse_id, staff_name, shift_type, starts_at, ends_at, status, clocked_in_at, clocked_out_at, is_sample)
    VALUES
      (v_hospital_id, v_ward_id, 'nurse', v_nurse_id, 'Nomvula Dlamini', 'night', now() - interval '1 day' - interval '4 hours', now() - interval '1 day' + interval '4 hours', 'completed', now() - interval '1 day' - interval '4 hours', now() - interval '1 day' + interval '4 hours', true),
      (v_hospital_id, v_ward_id, 'nurse', v_nurse_id, 'Nomvula Dlamini', 'day', now() - interval '2 hours', now() + interval '6 hours', 'in_progress', now() - interval '2 hours', null, true),
      (v_hospital_id, v_ward_id, 'nurse', v_nurse_id, 'Nomvula Dlamini', 'on_call', now() + interval '1 day', now() + interval '1 day' + interval '8 hours', 'scheduled', null, null, true);
  END IF;

  -- Patients in her ward — top up to at least 3 admitted patients.
  SELECT count(*) INTO v_admitted_count FROM public.hospital_inpatient_admissions
    WHERE ward_id = v_ward_id AND status = 'admitted';

  IF v_admitted_count < 3 THEN
    INSERT INTO public.hospital_inpatient_admissions
      (hospital_id, ward_id, patient_name, bed_number, admitted_at, status, reason, source, is_sample)
    SELECT v_hospital_id, v_ward_id, names.name, beds.bed, now() - (random() * interval '3 days'), 'admitted', 'Observation', 'manual', true
    FROM (VALUES ('Karabo Sithole'), ('Elzette de Beer'), ('Musa Ndlovu')) AS names(name)
    CROSS JOIN LATERAL (VALUES ((floor(random() * 8) + 1)::text)) AS beds(bed)
    LIMIT (3 - v_admitted_count);
  END IF;
END $$;

-- Confirm the result:
SELECT w.name AS ward_name, n.full_name AS nurse_name,
  (SELECT count(*) FROM public.hospital_staff_shifts WHERE nurse_id = n.id) AS shift_count,
  (SELECT count(*) FROM public.hospital_inpatient_admissions WHERE ward_id = w.id AND status = 'admitted') AS admitted_patients
FROM public.hospital_nurses n
JOIN public.hospital_wards w ON w.id = n.ward_id
WHERE n.id = 'bd493577-03a3-4a97-a1f3-38c4109e5ed6';
