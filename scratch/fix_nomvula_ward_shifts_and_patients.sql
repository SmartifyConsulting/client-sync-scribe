-- Run manually in the Supabase SQL editor.
--
-- Follow-up to fix_nomvula_ward_and_shifts.sql: Nomvula Dlamini still shows
-- no shifts and Ward Board redirected nurses to the hospital's own screens
-- (that routing bug is now fixed in code — this script only fixes data).
--
-- This script is fully idempotent — safe to run more than once. It:
--   1. Sets Nomvula's hospital_nurses.ward_id to General Ward A (if not set).
--   2. Ensures she has at least 3 shifts: one completed, one currently
--      in-progress (clocked in), one upcoming — all in General Ward A.
--   3. Ensures at least 3 known patients are admitted into General Ward A
--      (reuses existing sample/admitted patients where possible, only
--      inserts a fill patient if fewer than 3 are already in that ward).

DO $$
DECLARE
  v_hospital_id uuid;
  v_gen_a_id uuid;
  v_nurse_id uuid;
  v_shift_count int;
  v_admitted_count int;
BEGIN
  SELECT id INTO v_hospital_id FROM public.holarchelp_hospitals
    WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'zano@smartify.co.za') LIMIT 1;

  SELECT id INTO v_gen_a_id FROM public.hospital_wards
    WHERE hospital_id = v_hospital_id AND name = 'General Ward A' LIMIT 1;

  SELECT id INTO v_nurse_id FROM public.hospital_nurses
    WHERE hospital_id = v_hospital_id AND full_name = 'Nomvula Dlamini' LIMIT 1;

  IF v_hospital_id IS NULL OR v_gen_a_id IS NULL OR v_nurse_id IS NULL THEN
    RAISE EXCEPTION 'Missing hospital, General Ward A, or Nomvula Dlamini — run the main seed migration (20260815120100) first.';
  END IF;

  -- 1. Ward assignment.
  UPDATE public.hospital_nurses SET ward_id = v_gen_a_id WHERE id = v_nurse_id AND ward_id IS DISTINCT FROM v_gen_a_id;

  -- 2. Shifts — only top up if she currently has none.
  SELECT count(*) INTO v_shift_count FROM public.hospital_staff_shifts WHERE nurse_id = v_nurse_id;
  IF v_shift_count = 0 THEN
    INSERT INTO public.hospital_staff_shifts
      (hospital_id, ward_id, staff_role, nurse_id, staff_name, shift_type, starts_at, ends_at, status, clocked_in_at, clocked_out_at, is_sample)
    VALUES
      (v_hospital_id, v_gen_a_id, 'nurse', v_nurse_id, 'Nomvula Dlamini', 'night', now() - interval '1 day' - interval '4 hours', now() - interval '1 day' + interval '4 hours', 'completed', now() - interval '1 day' - interval '4 hours', now() - interval '1 day' + interval '4 hours', true),
      (v_hospital_id, v_gen_a_id, 'nurse', v_nurse_id, 'Nomvula Dlamini', 'day', now() - interval '2 hours', now() + interval '6 hours', 'in_progress', now() - interval '2 hours', null, true),
      (v_hospital_id, v_gen_a_id, 'nurse', v_nurse_id, 'Nomvula Dlamini', 'on_call', now() + interval '1 day', now() + interval '1 day' + interval '8 hours', 'scheduled', null, null, true);
  END IF;

  -- 3. Patients in her ward — top up to at least 3 admitted patients.
  SELECT count(*) INTO v_admitted_count FROM public.hospital_inpatient_admissions
    WHERE ward_id = v_gen_a_id AND status = 'admitted';

  IF v_admitted_count < 3 THEN
    INSERT INTO public.hospital_inpatient_admissions
      (hospital_id, ward_id, patient_name, bed_number, admitted_at, status, reason, source, is_sample)
    SELECT v_hospital_id, v_gen_a_id, names.name, beds.bed, now() - (random() * interval '3 days'), 'admitted', reasons.reason, 'manual', true
    FROM (VALUES ('Karabo Sithole'), ('Elzette de Beer'), ('Musa Ndlovu')) AS names(name)
    CROSS JOIN LATERAL (VALUES ('A-' || (floor(random() * 8) + 1)::int)) AS beds(bed)
    CROSS JOIN LATERAL (VALUES ('Observation')) AS reasons(reason)
    WHERE v_admitted_count < 3
    LIMIT (3 - v_admitted_count);
  END IF;
END $$;
