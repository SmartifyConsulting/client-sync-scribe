-- Run manually in the Supabase SQL editor.
--
-- Root cause: the "Nomvula Dlamini" hospital_nurses row (seeded in
-- 20260815120100_seed_hospital_admissions_and_shifts_demo_data.sql) is given
-- a hospital_id and an assigned shift in "General Ward A", but the
-- hospital_nurses.ward_id column itself is never set. The app's useNurseWard
-- hook reads ward_id straight off the nurse record (not off her shifts), so
-- her ward scoping (Ward Board, etc.) comes back empty even though her shift
-- and several admissions already exist in General Ward A.
--
-- This script: (1) sets her ward_id to General Ward A, matching her existing
-- shift, and (2) adds a couple more shifts (one completed, one upcoming) so
-- her My Shifts calendar shows more than a single in-progress entry.
-- Known patients (Georgia Adams, Dean Allie) are already admitted into
-- General Ward A by the original seed migration — no change needed there.

DO $$
DECLARE
  v_hospital_id uuid;
  v_gen_a_id uuid;
  v_nurse_id uuid;
BEGIN
  SELECT id INTO v_hospital_id FROM public.holarchelp_hospitals
    WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'zano@smartify.co.za') LIMIT 1;

  SELECT id INTO v_gen_a_id FROM public.hospital_wards
    WHERE hospital_id = v_hospital_id AND name = 'General Ward A' LIMIT 1;

  SELECT id INTO v_nurse_id FROM public.hospital_nurses
    WHERE hospital_id = v_hospital_id AND full_name = 'Nomvula Dlamini' LIMIT 1;

  IF v_hospital_id IS NULL OR v_gen_a_id IS NULL OR v_nurse_id IS NULL THEN
    RAISE EXCEPTION 'Missing hospital, General Ward A, or Nomvula Dlamini — run the main seed migration first.';
  END IF;

  -- Fix: give Nomvula's nurse record the ward assignment her shift implies.
  UPDATE public.hospital_nurses SET ward_id = v_gen_a_id WHERE id = v_nurse_id;

  -- A completed shift yesterday and an upcoming one tomorrow, alongside her
  -- existing in-progress shift, so the calendar has multiple entries.
  INSERT INTO public.hospital_staff_shifts
    (hospital_id, ward_id, staff_role, nurse_id, staff_name, shift_type, starts_at, ends_at, status, clocked_in_at, clocked_out_at, is_sample)
  VALUES
    (v_hospital_id, v_gen_a_id, 'nurse', v_nurse_id, 'Nomvula Dlamini', 'night', now() - interval '1 day' - interval '4 hours', now() - interval '1 day' + interval '4 hours', 'completed', now() - interval '1 day' - interval '4 hours', now() - interval '1 day' + interval '4 hours', true),
    (v_hospital_id, v_gen_a_id, 'nurse', v_nurse_id, 'Nomvula Dlamini', 'on_call', now() + interval '1 day', now() + interval '1 day' + interval '8 hours', 'scheduled', null, null, true);
END $$;
