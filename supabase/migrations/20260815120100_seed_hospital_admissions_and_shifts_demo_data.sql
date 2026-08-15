-- Promoted from scratch/seed_hospital_er_meaningful_data.sql (previously an
-- untracked one-off script, never actually applied) so Admissions and
-- Nomvula's shifts / data capturing show real demo data instead of empty
-- states.
--
-- IMPORTANT ORDERING NOTE: this migration deletes and recreates the
-- "Nomvula Dlamini" row in hospital_nurses. The `seed-nurse-user` edge
-- function links nurse.test@holarchealth.com to whichever hospital_nurses
-- row currently has full_name = 'Nomvula Dlamini'. If seed-nurse-user was
-- already invoked before this migration runs, that link will be dropped by
-- the DELETE below — re-invoke seed-nurse-user AFTER this migration applies
-- so Nomvula's login stays linked to her nurse record.
--
-- Comprehensive demo data for the Hospital (Holarc General Hospital,
-- owner zano@smartify.co.za) and ER (Renken Ambulance Service, owner
-- renken@smartify.co.za) dashboards, so every stats widget shows real
-- numbers instead of empty states.
--
-- Safe to re-run: it deletes its own previously-seeded rows first
-- (identified by is_sample = true / incident_number LIKE 'DEMO-%').
--
-- To remove everything this script created:
--   DELETE FROM public.holarchelp_incidents WHERE incident_number LIKE 'DEMO-%';
--   DELETE FROM public.hospital_beds WHERE ward_id IN (SELECT id FROM public.hospital_wards WHERE is_sample = true);
--   DELETE FROM public.hospital_inpatient_admissions WHERE is_sample = true;
--   DELETE FROM public.hospital_staff_shifts WHERE is_sample = true;
--   DELETE FROM public.hospital_nurses WHERE email LIKE '%.sample@email.test';
--   DELETE FROM public.hospital_wards WHERE is_sample = true;
--   DELETE FROM public.ambulances WHERE vehicle_code LIKE 'DEMO-%';

DO $$
DECLARE
  v_hospital_id uuid;
  v_provider_id uuid;

  v_icu_id uuid;
  v_gen_a_id uuid;
  v_gen_b_id uuid;
  v_mat_id uuid;
  v_paed_id uuid;

  v_nurse1_id uuid;
  v_nurse2_id uuid;
  v_nurse3_id uuid;
  v_doctor_id uuid;
  v_doctor_name text;

  v_amb1_id uuid;
  v_amb2_id uuid;
  v_amb3_id uuid;
  v_amb4_id uuid;

  -- Real patient records, looked up by name (best-effort — falls back to
  -- sample-only rows if a given patient doesn't exist in this environment).
  v_patient_georgia_id uuid; v_patient_georgia_user uuid; v_patient_georgia_name text;
  v_patient_sharon_id uuid; v_patient_sharon_user uuid; v_patient_sharon_name text;
  v_patient_samuel_id uuid; v_patient_samuel_user uuid; v_patient_samuel_name text;
  v_patient_dean_id uuid; v_patient_dean_user uuid; v_patient_dean_name text;

  v_inc1_id uuid; -- Sharon Kennedy: SOS -> transported -> admitted to ICU (the connected story)
BEGIN
  ----------------------------------------------------------------------
  -- Locate the two provider accounts
  ----------------------------------------------------------------------
  SELECT id INTO v_hospital_id FROM public.holarchelp_hospitals WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'zano@smartify.co.za') LIMIT 1;
  SELECT id INTO v_provider_id FROM public.holarchelp_ambulance_providers WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'renken@smartify.co.za') LIMIT 1;

  IF v_hospital_id IS NULL OR v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Missing hospital (zano@smartify.co.za) or ambulance provider (renken@smartify.co.za) account.';
  END IF;

  -- Best-effort patient lookups.
  -- Excludes any patient row that is a doctor's own auto-created self-service
  -- record (patient_user_id = user_id, and that user_id holds the 'doctor'
  -- role) — otherwise a doctor whose name happens to match one of these
  -- seeded patient names (e.g. "Georgia Adams") gets their own profile
  -- accidentally admitted as a hospital patient. Deterministic ORDER BY
  -- created_at breaks any remaining ties instead of relying on row order.
  SELECT p.id, p.user_id, p.name INTO v_patient_georgia_id, v_patient_georgia_user, v_patient_georgia_name
    FROM public.patients p
    WHERE p.name ILIKE 'Georgia Adams%'
      AND NOT (p.patient_user_id = p.user_id AND EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'doctor'
      ))
    ORDER BY p.created_at ASC LIMIT 1;
  SELECT p.id, p.user_id, p.name INTO v_patient_sharon_id, v_patient_sharon_user, v_patient_sharon_name
    FROM public.patients p
    WHERE (p.name ILIKE '%Sharon Kennedy%' OR p.name ILIKE '%Shannon Kennedy%')
      AND NOT (p.patient_user_id = p.user_id AND EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'doctor'
      ))
    ORDER BY p.created_at ASC LIMIT 1;
  SELECT p.id, p.user_id, p.name INTO v_patient_samuel_id, v_patient_samuel_user, v_patient_samuel_name
    FROM public.patients p
    WHERE (p.name ILIKE '%Samuel%Okoli%' OR p.name ILIKE '%Okoli%Samuel%')
      AND NOT (p.patient_user_id = p.user_id AND EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'doctor'
      ))
    ORDER BY p.created_at ASC LIMIT 1;
  SELECT p.id, p.user_id, p.name INTO v_patient_dean_id, v_patient_dean_user, v_patient_dean_name
    FROM public.patients p
    WHERE p.name ILIKE 'Dean Allie%'
      AND NOT (p.patient_user_id = p.user_id AND EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'doctor'
      ))
    ORDER BY p.created_at ASC LIMIT 1;

  ----------------------------------------------------------------------
  -- Clean up any previous run of this script
  ----------------------------------------------------------------------
  DELETE FROM public.holarchelp_incidents WHERE incident_number LIKE 'DEMO-%';
  DELETE FROM public.hospital_beds WHERE ward_id IN (SELECT id FROM public.hospital_wards WHERE hospital_id = v_hospital_id AND is_sample = true);
  DELETE FROM public.hospital_inpatient_admissions WHERE hospital_id = v_hospital_id AND is_sample = true;
  DELETE FROM public.hospital_staff_shifts WHERE hospital_id = v_hospital_id AND is_sample = true;
  DELETE FROM public.hospital_nurses WHERE hospital_id = v_hospital_id AND email LIKE '%.sample@email.test';
  DELETE FROM public.hospital_wards WHERE hospital_id = v_hospital_id AND is_sample = true;
  DELETE FROM public.ambulances WHERE provider_id = v_provider_id AND vehicle_code LIKE 'DEMO-%';

  ----------------------------------------------------------------------
  -- Hospital capacity/status (drives the top status strip + ER card)
  ----------------------------------------------------------------------
  UPDATE public.holarchelp_hospitals
  SET
    bed_capacity = 42,
    beds_available = 9,
    icu_capacity = 8,
    icu_available = 2,
    er_beds_available = 4,
    er_capacity_status = 'yellow',
    has_emergency_department = true,
    accepting_patients = true,
    at_capacity = false
  WHERE id = v_hospital_id;

  ----------------------------------------------------------------------
  -- Wards
  ----------------------------------------------------------------------
  INSERT INTO public.hospital_wards (hospital_id, name, ward_type, bed_capacity, is_active, is_sample)
  VALUES (v_hospital_id, 'ICU', 'icu', 8, true, true) RETURNING id INTO v_icu_id;
  INSERT INTO public.hospital_wards (hospital_id, name, ward_type, bed_capacity, is_active, is_sample)
  VALUES (v_hospital_id, 'General Ward A', 'general', 12, true, true) RETURNING id INTO v_gen_a_id;
  INSERT INTO public.hospital_wards (hospital_id, name, ward_type, bed_capacity, is_active, is_sample)
  VALUES (v_hospital_id, 'General Ward B', 'general', 10, true, true) RETURNING id INTO v_gen_b_id;
  INSERT INTO public.hospital_wards (hospital_id, name, ward_type, bed_capacity, is_active, is_sample)
  VALUES (v_hospital_id, 'Maternity', 'maternity', 6, true, true) RETURNING id INTO v_mat_id;
  INSERT INTO public.hospital_wards (hospital_id, name, ward_type, bed_capacity, is_active, is_sample)
  VALUES (v_hospital_id, 'Paediatrics', 'paediatric', 6, true, true) RETURNING id INTO v_paed_id;

  ----------------------------------------------------------------------
  -- Beds — one row per bed_capacity slot so occupancy % computes for real
  ----------------------------------------------------------------------
  INSERT INTO public.hospital_beds (ward_id, bed_number, status)
  SELECT v_icu_id, 'ICU-' || n, CASE WHEN n <= 6 THEN 'occupied' ELSE 'available' END FROM generate_series(1,8) n;
  INSERT INTO public.hospital_beds (ward_id, bed_number, status)
  SELECT v_gen_a_id, 'A-' || n, CASE WHEN n <= 9 THEN 'occupied' ELSE 'available' END FROM generate_series(1,12) n;
  INSERT INTO public.hospital_beds (ward_id, bed_number, status)
  SELECT v_gen_b_id, 'B-' || n, CASE WHEN n <= 6 THEN 'occupied' ELSE 'available' END FROM generate_series(1,10) n;
  INSERT INTO public.hospital_beds (ward_id, bed_number, status)
  SELECT v_mat_id, 'M-' || n, CASE WHEN n <= 3 THEN 'occupied' ELSE 'available' END FROM generate_series(1,6) n;
  INSERT INTO public.hospital_beds (ward_id, bed_number, status)
  SELECT v_paed_id, 'P-' || n, CASE WHEN n <= 2 THEN 'occupied' ELSE 'available' END FROM generate_series(1,6) n;

  ----------------------------------------------------------------------
  -- Staff — nurses + shifts covering "today" so on-duty counts are real
  ----------------------------------------------------------------------
  SELECT id, full_name INTO v_doctor_id, v_doctor_name FROM public.profiles WHERE role = 'doctor' LIMIT 1;

  INSERT INTO public.hospital_nurses (hospital_id, full_name, role_title, email, mobile_number, status)
  VALUES (v_hospital_id, 'Nomvula Dlamini', 'Staff Nurse', 'nomvula.sample@email.test', '+27831112222', 'active')
  RETURNING id INTO v_nurse1_id;
  INSERT INTO public.hospital_nurses (hospital_id, full_name, role_title, email, mobile_number, status)
  VALUES (v_hospital_id, 'Pieter van Wyk', 'Charge Nurse', 'pieter.sample@email.test', '+27833334444', 'active')
  RETURNING id INTO v_nurse2_id;
  INSERT INTO public.hospital_nurses (hospital_id, full_name, role_title, email, mobile_number, status)
  VALUES (v_hospital_id, 'Thandiwe Mokoena', 'ICU Nurse', 'thandiwe.sample@email.test', '+27835556666', 'active')
  RETURNING id INTO v_nurse3_id;

  INSERT INTO public.hospital_staff_shifts (hospital_id, ward_id, staff_role, nurse_id, staff_name, shift_type, starts_at, ends_at, status, clocked_in_at, is_sample)
  VALUES
    (v_hospital_id, v_icu_id, 'nurse', v_nurse3_id, 'Thandiwe Mokoena', 'day', now() - interval '3 hours', now() + interval '5 hours', 'in_progress', now() - interval '3 hours', true),
    (v_hospital_id, v_gen_a_id, 'nurse', v_nurse1_id, 'Nomvula Dlamini', 'day', now() - interval '2 hours', now() + interval '6 hours', 'in_progress', now() - interval '2 hours', true),
    (v_hospital_id, v_gen_b_id, 'nurse', v_nurse2_id, 'Pieter van Wyk', 'night', now() + interval '6 hours', now() + interval '14 hours', 'scheduled', null, true);

  IF v_doctor_id IS NOT NULL THEN
    INSERT INTO public.hospital_staff_shifts (hospital_id, ward_id, staff_role, doctor_id, staff_name, shift_type, starts_at, ends_at, status, clocked_in_at, is_sample)
    VALUES (v_hospital_id, v_icu_id, 'doctor', v_doctor_id, COALESCE(v_doctor_name, 'Doctor'), 'day', now() - interval '1 hour', now() + interval '7 hours', 'in_progress', now() - interval '1 hour', true);
  END IF;

  ----------------------------------------------------------------------
  -- Inpatient admissions — mix of real linked patients + sample fill,
  -- across statuses so the Admissions/Triage boards aren't monotone.
  ----------------------------------------------------------------------

  -- The connected story: Sharon Kennedy — SOS -> transported -> ICU admission
  INSERT INTO public.holarchelp_incidents (
    incident_number, user_id, status, severity, coverage,
    destination_hospital_id, assigned_provider_id, assigned_ambulance_id,
    triggered_by_role, hospital_acceptance_status, hospital_admission_status, triage_priority,
    created_at, accepted_at, en_route_at, arrived_at, patient_collected_at, at_hospital_at,
    notes
  ) VALUES (
    'DEMO-1001', COALESCE(v_patient_sharon_user, v_provider_id), 'at_hospital', 'critical', 'private',
    v_hospital_id, v_provider_id, null,
    'patient', 'accepted', 'admitted', 'esi-1',
    now() - interval '3 hours', now() - interval '2 hours 50 minutes', now() - interval '2 hours 40 minutes',
    now() - interval '2 hours 10 minutes', now() - interval '2 hours', now() - interval '1 hour 40 minutes',
    'Sample data — motor vehicle collision, multiple trauma. Safe to delete (incident_number LIKE ''DEMO-%'').'
  ) RETURNING id INTO v_inc1_id;

  INSERT INTO public.hospital_inpatient_admissions (
    hospital_id, ward_id, patient_id, patient_user_id, patient_name,
    bed_number, admitted_at, status, reason, source, incident_id, is_sample
  ) VALUES (
    v_hospital_id, v_icu_id, v_patient_sharon_id, v_patient_sharon_user, COALESCE(v_patient_sharon_name, 'Sharon Kennedy'),
    'ICU-1', now() - interval '1 hour 40 minutes', 'admitted', 'Motor vehicle collision — multiple trauma', 'ambulance', v_inc1_id, true
  );

  -- Other real patients, various wards/statuses
  IF v_patient_georgia_id IS NOT NULL THEN
    INSERT INTO public.hospital_inpatient_admissions (hospital_id, ward_id, patient_id, patient_user_id, patient_name, bed_number, admitted_at, status, reason, source, is_sample)
    VALUES (v_hospital_id, v_gen_a_id, v_patient_georgia_id, v_patient_georgia_user, v_patient_georgia_name, 'A-2', now() - interval '1 day', 'admitted', 'Observation post-procedure', 'referral', true);
  END IF;
  IF v_patient_samuel_id IS NOT NULL THEN
    INSERT INTO public.hospital_inpatient_admissions (hospital_id, ward_id, patient_id, patient_user_id, patient_name, bed_number, admitted_at, status, reason, source, is_sample)
    VALUES (v_hospital_id, v_gen_b_id, v_patient_samuel_id, v_patient_samuel_user, v_patient_samuel_name, 'B-1', now() - interval '2 days', 'discharge_pending', 'Recovering, awaiting discharge review', 'walk_in', true);
  END IF;
  IF v_patient_dean_id IS NOT NULL THEN
    INSERT INTO public.hospital_inpatient_admissions (hospital_id, ward_id, patient_id, patient_user_id, patient_name, bed_number, admitted_at, discharged_at, status, reason, source, is_sample)
    VALUES (v_hospital_id, v_gen_a_id, v_patient_dean_id, v_patient_dean_user, v_patient_dean_name, 'A-3', now() - interval '4 days', now() - interval '3 hours', 'discharged', 'Short stay observation', 'walk_in', true);
  END IF;

  -- Sample-named fill so ward occupancy matches the bed layout above
  INSERT INTO public.hospital_inpatient_admissions (hospital_id, ward_id, patient_name, bed_number, admitted_at, status, reason, source, is_sample)
  VALUES
    (v_hospital_id, v_icu_id, 'Naledi Mahlangu (Sample)', 'ICU-2', now() - interval '6 hours', 'admitted', 'Post-op cardiac monitoring', 'referral', true),
    (v_hospital_id, v_icu_id, 'Johan Botha (Sample)', 'ICU-3', now() - interval '10 hours', 'admitted', 'Septic shock, stabilising', 'ambulance', true),
    (v_hospital_id, v_icu_id, 'Rethabile Nkosi (Sample)', 'ICU-4', now() - interval '1 day', 'admitted', 'Respiratory failure', 'referral', true),
    (v_hospital_id, v_icu_id, 'Willem Pretorius (Sample)', 'ICU-5', now() - interval '2 days', 'admitted', 'Stroke recovery', 'ambulance', true),
    (v_hospital_id, v_icu_id, 'Amahle Dube (Sample)', 'ICU-6', now() - interval '8 hours', 'admitted', 'Trauma, multi-organ watch', 'ambulance', true),
    (v_hospital_id, v_gen_a_id, 'Karabo Sithole (Sample)', 'A-1', now() - interval '5 hours', 'admitted', 'Community-acquired pneumonia', 'walk_in', true),
    (v_hospital_id, v_gen_a_id, 'Elzette de Beer (Sample)', 'A-4', now() - interval '1 day', 'admitted', 'Diabetic ketoacidosis, stabilised', 'referral', true),
    (v_hospital_id, v_gen_a_id, 'Musa Ndlovu (Sample)', 'A-5', now() - interval '3 days', 'admitted', 'Appendectomy recovery', 'walk_in', true),
    (v_hospital_id, v_gen_a_id, 'Annelie Fourie (Sample)', 'A-6', now() - interval '2 days', 'admitted', 'Cellulitis, IV antibiotics', 'walk_in', true),
    (v_hospital_id, v_gen_a_id, 'Bongani Zulu (Sample)', 'A-7', now() - interval '12 hours', 'admitted', 'Fractured femur, pre-op', 'ambulance', true),
    (v_hospital_id, v_gen_a_id, 'Cindy Adams (Sample)', 'A-8', now() - interval '6 hours', 'admitted', 'Hypertensive crisis', 'walk_in', true),
    (v_hospital_id, v_gen_a_id, 'Sipho Khumalo (Sample)', 'A-9', now() - interval '1 day', 'admitted', 'Gastroenteritis, rehydration', 'walk_in', true),
    (v_hospital_id, v_gen_b_id, 'Marié Steyn (Sample)', 'B-2', now() - interval '4 hours', 'admitted', 'Chest pain, cardiology workup', 'ambulance', true),
    (v_hospital_id, v_gen_b_id, 'Thabo Mabaso (Sample)', 'B-3', now() - interval '9 hours', 'admitted', 'Asthma exacerbation', 'walk_in', true),
    (v_hospital_id, v_gen_b_id, 'Lindiwe Cele (Sample)', 'B-4', now() - interval '1 day', 'admitted', 'Post-op general surgery', 'referral', true),
    (v_hospital_id, v_gen_b_id, 'Riaan Joubert (Sample)', 'B-5', now() - interval '2 days', 'admitted', 'Renal colic, pain management', 'walk_in', true),
    (v_hospital_id, v_gen_b_id, 'Zanele Mthembu (Sample)', 'B-6', now() - interval '3 hours', 'admitted', 'Cellulitis of the leg', 'walk_in', true),
    (v_hospital_id, v_mat_id, 'Precious Nkabinde (Sample)', 'M-1', now() - interval '5 hours', 'admitted', 'Post-natal recovery', 'walk_in', true),
    (v_hospital_id, v_mat_id, 'Yolandi Venter (Sample)', 'M-2', now() - interval '1 day', 'admitted', 'Pre-eclampsia monitoring', 'referral', true),
    (v_hospital_id, v_mat_id, 'Nomsa Radebe (Sample)', 'M-3', now() - interval '8 hours', 'discharge_pending', 'Normal delivery, ready for discharge', 'walk_in', true),
    (v_hospital_id, v_paed_id, 'Master Kagiso Molefe (Sample)', 'P-1', now() - interval '6 hours', 'admitted', 'Bronchiolitis, oxygen support', 'walk_in', true),
    (v_hospital_id, v_paed_id, 'Master Liam Botes (Sample)', 'P-2', now() - interval '1 day', 'admitted', 'Febrile seizure, observation', 'ambulance', true);

  ----------------------------------------------------------------------
  -- ER incidents destined for the hospital — populates ER Coordination /
  -- Triage board / Incoming Ambulances across every stage.
  ----------------------------------------------------------------------
  INSERT INTO public.holarchelp_incidents (
    incident_number, user_id, status, severity, coverage,
    destination_hospital_id, assigned_provider_id,
    triggered_by_role, hospital_acceptance_status, eta_minutes, created_at, en_route_at, notes
  ) VALUES
  ('DEMO-1002', v_provider_id, 'en_route', 'critical', 'private', v_hospital_id, v_provider_id, 'patient', 'accepted', 8, now() - interval '15 minutes', now() - interval '10 minutes', 'Sample — chest pain, en route.'),
  ('DEMO-1003', v_provider_id, 'assigned', 'high', 'private', v_hospital_id, v_provider_id, 'patient', 'pending', 22, now() - interval '5 minutes', null, 'Sample — fall from height, ambulance assigned.'),
  ('DEMO-1004', v_provider_id, 'arrived', 'high', 'private', v_hospital_id, v_provider_id, 'patient', 'accepted', 0, now() - interval '35 minutes', now() - interval '30 minutes', 'Sample — arrived at ER, awaiting triage.');

  UPDATE public.holarchelp_incidents SET arrived_at = now() - interval '20 minutes' WHERE incident_number = 'DEMO-1004';

  INSERT INTO public.holarchelp_incidents (
    incident_number, user_id, status, severity, coverage,
    destination_hospital_id, assigned_provider_id,
    triggered_by_role, hospital_acceptance_status, hospital_admission_status, triage_priority, triage_bay, triage_nurse,
    created_at, en_route_at, arrived_at, at_hospital_at, notes
  ) VALUES
  ('DEMO-1005', v_provider_id, 'at_hospital', 'moderate', 'private', v_hospital_id, v_provider_id, 'patient', 'accepted', 'in_triage', 'esi-3', 'Resus-1', 'Nomvula Dlamini',
   now() - interval '1 hour', now() - interval '55 minutes', now() - interval '40 minutes', now() - interval '35 minutes', 'Sample — laceration, in triage.'),
  ('DEMO-1006', v_provider_id, 'completed', 'moderate', 'private', v_hospital_id, v_provider_id, 'patient', 'accepted', 'admitted', 'esi-2', 'Resus-2', 'Pieter van Wyk',
   now() - interval '5 hours', now() - interval '4 hours 50 minutes', now() - interval '4 hours 20 minutes', now() - interval '4 hours', 'Sample — completed transfer, admitted earlier today.');

  UPDATE public.holarchelp_incidents SET completed_at = now() - interval '3 hours' WHERE incident_number = 'DEMO-1006';

  -- Two fully open/unassigned SOS calls (no provider yet) — populates the
  -- Live/Open SOS count on ANY ambulance provider's dashboard.
  INSERT INTO public.holarchelp_incidents (
    incident_number, user_id, status, severity, coverage, triggered_by_role, created_at, notes
  ) VALUES
  ('DEMO-1007', v_provider_id, 'open', 'high', 'private', 'patient', now() - interval '2 minutes', 'Sample — new SOS, unassigned.'),
  ('DEMO-1008', v_provider_id, 'open', 'moderate', 'private', 'patient', now() - interval '7 minutes', 'Sample — new SOS, unassigned.');

  ----------------------------------------------------------------------
  -- Ambulance fleet — varied statuses for Fleet/Dispatch screens
  ----------------------------------------------------------------------
  INSERT INTO public.ambulances (provider_id, vehicle_code, registration_number, status)
  VALUES (v_provider_id, 'DEMO-AMB-1', 'CA 111-001', 'en_route') RETURNING id INTO v_amb1_id;
  INSERT INTO public.ambulances (provider_id, vehicle_code, registration_number, status)
  VALUES (v_provider_id, 'DEMO-AMB-2', 'CA 111-002', 'assigned') RETURNING id INTO v_amb2_id;
  INSERT INTO public.ambulances (provider_id, vehicle_code, registration_number, status)
  VALUES (v_provider_id, 'DEMO-AMB-3', 'CA 111-003', 'available') RETURNING id INTO v_amb3_id;
  INSERT INTO public.ambulances (provider_id, vehicle_code, registration_number, status)
  VALUES (v_provider_id, 'DEMO-AMB-4', 'CA 111-004', 'maintenance') RETURNING id INTO v_amb4_id;

  UPDATE public.holarchelp_incidents SET assigned_ambulance_id = v_amb1_id WHERE incident_number = 'DEMO-1002';
  UPDATE public.holarchelp_incidents SET assigned_ambulance_id = v_amb2_id WHERE incident_number = 'DEMO-1003';

  RAISE NOTICE 'Seed complete: hospital=%, provider=%, sample incidents DEMO-1001..1008', v_hospital_id, v_provider_id;
END $$;
