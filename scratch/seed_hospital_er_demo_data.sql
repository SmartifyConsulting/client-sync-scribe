-- Demo data: threads a patient through ER -> Hospital admission, adds two
-- standalone Live Queue incidents, and seeds Staff/Schedules for the hospital.
-- Safe to re-run (idempotent lookups) and safe to delete later via:
--   DELETE FROM public.holarchelp_incidents WHERE incident_number LIKE 'DEMO-%';
--   DELETE FROM public.hospital_inpatient_admissions WHERE is_sample = true;
--   DELETE FROM public.hospital_staff_shifts WHERE is_sample = true;
--   DELETE FROM public.hospital_nurses WHERE email LIKE '%.sample@email.test';
--   DELETE FROM public.hospital_wards WHERE name = 'General Ward (Sample)';

DO $$
DECLARE
  v_hospital_id uuid;
  v_provider_id uuid;
  v_patient_auth_id uuid;
  v_patient_id uuid;
  v_ward_id uuid;
  v_ambulance_id uuid;
  v_incident_thread_id uuid;
  v_admission_id uuid;
  v_nurse1_id uuid;
  v_nurse2_id uuid;
  v_doctor_id uuid;
  v_doctor_name text;
BEGIN
  -- Locate existing test accounts (created by "seed-test-providers"/"seed-test-er-user")
  SELECT h.id INTO v_hospital_id
  FROM public.holarchelp_hospitals h
  JOIN auth.users u ON u.id = h.owner_id
  WHERE u.email IN ('zano@smartify.co.za', 'hospital.test@holarchealth.com')
  ORDER BY (u.email = 'hospital.test@holarchealth.com') DESC
  LIMIT 1;

  SELECT p.id INTO v_provider_id
  FROM public.holarchelp_ambulance_providers p
  JOIN auth.users u ON u.id = p.owner_id
  WHERE u.email IN ('renken@smartify.co.za', 'er.test@holarchealth.com')
  ORDER BY (u.email = 'er.test@holarchealth.com') DESC
  LIMIT 1;

  SELECT id INTO v_patient_auth_id FROM auth.users WHERE email = 'projectmanager@smartify.co.za' LIMIT 1;

  IF v_hospital_id IS NULL OR v_provider_id IS NULL OR v_patient_auth_id IS NULL THEN
    RAISE EXCEPTION 'Missing a required test account (hospital, ER provider, or patient). Seed the test providers/patient first.';
  END IF;

  -- Patient row (create one for this test user if it doesn't exist yet)
  SELECT id INTO v_patient_id FROM public.patients WHERE user_id = v_patient_auth_id LIMIT 1;
  IF v_patient_id IS NULL THEN
    INSERT INTO public.patients (user_id, patient_user_id, name, first_name, last_name, dob, gender, phone, email, is_sample)
    VALUES (v_patient_auth_id, v_patient_auth_id, 'Shannon Kennedy', 'Shannon', 'Kennedy', '1990-04-12', 'female', '+27821234567', 'projectmanager@smartify.co.za', true)
    RETURNING id INTO v_patient_id;
  END IF;

  -- Sample ward
  SELECT id INTO v_ward_id FROM public.hospital_wards WHERE hospital_id = v_hospital_id AND name = 'General Ward (Sample)' LIMIT 1;
  IF v_ward_id IS NULL THEN
    INSERT INTO public.hospital_wards (hospital_id, name, ward_type, bed_capacity, is_sample)
    VALUES (v_hospital_id, 'General Ward (Sample)', 'general', 20, true)
    RETURNING id INTO v_ward_id;
  END IF;

  -- Sample ambulance
  SELECT id INTO v_ambulance_id FROM public.ambulances WHERE provider_id = v_provider_id AND vehicle_code = 'DEMO-AMB-1' LIMIT 1;
  IF v_ambulance_id IS NULL THEN
    INSERT INTO public.ambulances (provider_id, vehicle_code, registration_number, status)
    VALUES (v_provider_id, 'DEMO-AMB-1', 'CA 123-456', 'available')
    RETURNING id INTO v_ambulance_id;
  END IF;

  -- Any existing doctor profile, for an optional doctor shift row
  SELECT id, full_name INTO v_doctor_id, v_doctor_name FROM public.profiles WHERE role = 'doctor' LIMIT 1;

  -- === THREAD: Patient -> ER incident -> Hospital admission ===
  INSERT INTO public.holarchelp_incidents (
    incident_number, user_id, status, severity, coverage,
    destination_hospital_id, assigned_provider_id, assigned_ambulance_id,
    triggered_by_role, hospital_acceptance_status, hospital_admission_status,
    created_at, accepted_at, en_route_at, arrived_at, patient_collected_at, at_hospital_at,
    notes
  ) VALUES (
    'DEMO-1001', v_patient_auth_id, 'at_hospital', 'critical', 'private',
    v_hospital_id, v_provider_id, v_ambulance_id,
    'patient', 'accepted', 'admitted',
    now() - interval '3 hours', now() - interval '2 hours 50 minutes', now() - interval '2 hours 40 minutes',
    now() - interval '2 hours 10 minutes', now() - interval '2 hours', now() - interval '1 hour 40 minutes',
    'Sample data - motor vehicle collision, multiple trauma. Safe to delete (incident_number LIKE ''DEMO-%'').'
  )
  RETURNING id INTO v_incident_thread_id;

  INSERT INTO public.hospital_inpatient_admissions (
    hospital_id, ward_id, patient_id, patient_user_id, patient_name,
    bed_number, admitted_at, status, reason, source, incident_id, is_sample
  ) VALUES (
    v_hospital_id, v_ward_id, v_patient_id, v_patient_auth_id, 'Shannon Kennedy',
    'A12', now() - interval '1 hour 40 minutes', 'admitted', 'Motor vehicle collision - multiple trauma', 'ambulance', v_incident_thread_id, true
  )
  RETURNING id INTO v_admission_id;

  -- === LIVE QUEUE: two more incidents still in transit, not yet admitted ===
  INSERT INTO public.holarchelp_incidents (
    incident_number, user_id, status, severity, coverage,
    destination_hospital_id, assigned_provider_id, assigned_ambulance_id,
    triggered_by_role, hospital_acceptance_status, eta_minutes, created_at, en_route_at, notes
  ) VALUES (
    'DEMO-1002', v_patient_auth_id, 'en_route', 'critical', 'private',
    v_hospital_id, v_provider_id, v_ambulance_id,
    'patient', 'pending', 12, now() - interval '20 minutes', now() - interval '15 minutes',
    'Sample data - chest pain, en route. Safe to delete.'
  );

  INSERT INTO public.holarchelp_incidents (
    incident_number, user_id, status, severity, coverage,
    destination_hospital_id, assigned_provider_id,
    triggered_by_role, hospital_acceptance_status, eta_minutes, created_at, notes
  ) VALUES (
    'DEMO-1003', v_patient_auth_id, 'assigned', 'critical', 'private',
    v_hospital_id, v_provider_id,
    'patient', 'pending', 25, now() - interval '5 minutes',
    'Sample data - minor fall, ambulance assigned. Safe to delete.'
  );

  -- === STAFF & SCHEDULES ===
  INSERT INTO public.hospital_nurses (hospital_id, full_name, role_title, email, mobile_number, status)
  VALUES (v_hospital_id, 'Nomvula Dlamini', 'Staff Nurse', 'nomvula.sample@email.test', '+27831112222', 'active')
  RETURNING id INTO v_nurse1_id;

  INSERT INTO public.hospital_nurses (hospital_id, full_name, role_title, email, mobile_number, status)
  VALUES (v_hospital_id, 'Pieter van Wyk', 'Charge Nurse', 'pieter.sample@email.test', '+27833334444', 'active')
  RETURNING id INTO v_nurse2_id;

  INSERT INTO public.hospital_staff_shifts (hospital_id, ward_id, staff_role, nurse_id, staff_name, shift_type, starts_at, ends_at, status, is_sample)
  VALUES
    (v_hospital_id, v_ward_id, 'nurse', v_nurse1_id, 'Nomvula Dlamini', 'day', now() - interval '2 hours', now() + interval '6 hours', 'in_progress', true),
    (v_hospital_id, v_ward_id, 'nurse', v_nurse2_id, 'Pieter van Wyk', 'night', now() + interval '6 hours', now() + interval '14 hours', 'scheduled', true);

  IF v_doctor_id IS NOT NULL THEN
    INSERT INTO public.hospital_staff_shifts (hospital_id, ward_id, staff_role, doctor_id, staff_name, shift_type, starts_at, ends_at, status, is_sample)
    VALUES (v_hospital_id, v_ward_id, 'doctor', v_doctor_id, COALESCE(v_doctor_name, 'Doctor'), 'day', now() - interval '1 hour', now() + interval '7 hours', 'in_progress', true);
  END IF;

  RAISE NOTICE 'Sample data created: patient=%, hospital=%, ward=%, thread incident=%, admission=%', v_patient_id, v_hospital_id, v_ward_id, v_incident_thread_id, v_admission_id;
END $$;
