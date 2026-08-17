-- Demo data for the doctor-facing Admissions screen (hospital_admissions —
-- distinct from hospital_inpatient_admissions, which is the hospital
-- provider's own table and was already seeded separately). Covers every
-- seeded doctor test profile: sme@smartify.co.za (Dean Allie) and
-- dr.buttons@smartify.co.za (Dr Gianna Buttons).
--
-- Safe to re-run: deletes its own previously-seeded rows first
-- (title LIKE 'DEMO -%').
DO $$
DECLARE
  r RECORD;
  v_doctor_id uuid;
  v_patient RECORD;
  v_i int;
  v_hospitals text[] := ARRAY['Holarc General Hospital', 'Netcare Sunward Park', 'Life Fourways Hospital', 'Mediclinic Sandton'];
  v_diagnoses text[] := ARRAY['Community-acquired pneumonia', 'Appendicitis', 'Hypertensive crisis', 'Elective knee surgery', 'Gastroenteritis, dehydration'];
BEGIN
  DELETE FROM public.hospital_admissions WHERE title LIKE 'DEMO -%';

  FOR r IN
    SELECT unnest(ARRAY['sme@smartify.co.za', 'dr.buttons@smartify.co.za']) AS email
  LOOP
    SELECT id INTO v_doctor_id FROM auth.users WHERE email = r.email;
    IF v_doctor_id IS NULL THEN
      CONTINUE;
    END IF;

    v_i := 0;
    FOR v_patient IN
      SELECT id, name FROM public.patients WHERE user_id = v_doctor_id ORDER BY created_at ASC LIMIT 4
    LOOP
      v_i := v_i + 1;
      INSERT INTO public.hospital_admissions (
        patient_id, doctor_id, hospital, admission_date, discharge_date,
        diagnosis, status, title, procedure_description, source, created_by
      ) VALUES (
        v_patient.id, v_doctor_id, v_hospitals[1 + (v_i % array_length(v_hospitals, 1))],
        (now() - (v_i || ' days')::interval)::date,
        CASE WHEN v_i % 2 = 0 THEN (now() - ((v_i - 2) || ' days')::interval)::date ELSE NULL END,
        v_diagnoses[1 + (v_i % array_length(v_diagnoses, 1))],
        CASE WHEN v_i % 2 = 0 THEN 'discharged' ELSE 'admitted' END,
        'DEMO - ' || v_patient.name,
        'Routine admission for ' || lower(v_diagnoses[1 + (v_i % array_length(v_diagnoses, 1))]),
        'manual', v_doctor_id
      );
    END LOOP;
  END LOOP;
END $$;
