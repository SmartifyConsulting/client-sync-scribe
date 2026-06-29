
-- PART A: Merge Sharon Kennedy duplicate patient records
UPDATE public.patients AS p SET
  name = 'Sharon Elise Kennedy',
  first_name = 'Sharon',
  last_name = 'Kennedy',
  phone = COALESCE(NULLIF(p.phone,''), NULLIF(d.phone,'')),
  dob = COALESCE(p.dob, d.dob),
  address = COALESCE(NULLIF(p.address,''), NULLIF(d.address,'')),
  notes = COALESCE(NULLIF(p.notes,''), NULLIF(d.notes,'')),
  physical_address = COALESCE(NULLIF(p.physical_address,''), NULLIF(d.physical_address,'')),
  postal_address = COALESCE(NULLIF(p.postal_address,''), NULLIF(d.postal_address,'')),
  referred_by = COALESCE(NULLIF(p.referred_by,''), NULLIF(d.referred_by,'')),
  employer = COALESCE(NULLIF(p.employer,''), NULLIF(d.employer,'')),
  occupation = COALESCE(NULLIF(p.occupation,''), NULLIF(d.occupation,'')),
  medical_aid = COALESCE(NULLIF(p.medical_aid,''), NULLIF(d.medical_aid,'')),
  medical_aid_number = COALESCE(NULLIF(p.medical_aid_number,''), NULLIF(d.medical_aid_number,'')),
  primary_member = COALESCE(NULLIF(p.primary_member,''), NULLIF(d.primary_member,'')),
  next_of_kin_name = COALESCE(NULLIF(p.next_of_kin_name,''), NULLIF(d.next_of_kin_name,'')),
  next_of_kin_phone = COALESCE(NULLIF(p.next_of_kin_phone,''), NULLIF(d.next_of_kin_phone,'')),
  next_of_kin_email = COALESCE(NULLIF(p.next_of_kin_email,''), NULLIF(d.next_of_kin_email,'')),
  next_of_kin_relationship = COALESCE(NULLIF(p.next_of_kin_relationship,''), NULLIF(d.next_of_kin_relationship,'')),
  general_practitioner = COALESCE(NULLIF(p.general_practitioner,''), NULLIF(d.general_practitioner,'')),
  allergies = COALESCE(NULLIF(p.allergies,''), NULLIF(d.allergies,'')),
  claims_email = COALESCE(NULLIF(p.claims_email,''), NULLIF(d.claims_email,'')),
  medical_insurance_product = COALESCE(NULLIF(p.medical_insurance_product,''), NULLIF(d.medical_insurance_product,'')),
  height_cm = COALESCE(p.height_cm, d.height_cm),
  weight_kg = COALESCE(p.weight_kg, d.weight_kg),
  marital_status = COALESCE(NULLIF(p.marital_status,''), NULLIF(d.marital_status,'')),
  id_passport_number = COALESCE(NULLIF(p.id_passport_number,''), NULLIF(d.id_passport_number,'')),
  gender = COALESCE(NULLIF(p.gender,''), NULLIF(d.gender,'')),
  pharmacy_name = COALESCE(NULLIF(p.pharmacy_name,''), NULLIF(d.pharmacy_name,'')),
  pharmacy_email = COALESCE(NULLIF(p.pharmacy_email,''), NULLIF(d.pharmacy_email,'')),
  blood_type = COALESCE(NULLIF(p.blood_type,''), NULLIF(d.blood_type,'')),
  reporting_to_email = COALESCE(NULLIF(p.reporting_to_email,''), NULLIF(d.reporting_to_email,'')),
  organ_donor = COALESCE(p.organ_donor, d.organ_donor),
  same_as_physical = COALESCE(p.same_as_physical, d.same_as_physical),
  emergency_contact_name = COALESCE(NULLIF(p.emergency_contact_name,''), NULLIF(d.emergency_contact_name,'')),
  emergency_contact_phone = COALESCE(NULLIF(p.emergency_contact_phone,''), NULLIF(d.emergency_contact_phone,'')),
  emergency_contact_email = COALESCE(NULLIF(p.emergency_contact_email,''), NULLIF(d.emergency_contact_email,'')),
  emergency_contact_relationship = COALESCE(NULLIF(p.emergency_contact_relationship,''), NULLIF(d.emergency_contact_relationship,'')),
  preferred_language = COALESCE(NULLIF(p.preferred_language,''), NULLIF(d.preferred_language,'')),
  chronic_medications = COALESCE(NULLIF(p.chronic_medications,''), NULLIF(d.chronic_medications,'')),
  surgeries = CASE WHEN jsonb_array_length(COALESCE(p.surgeries,'[]'::jsonb)) > 0 THEN p.surgeries ELSE COALESCE(d.surgeries, p.surgeries) END,
  pharmacies = CASE WHEN jsonb_array_length(COALESCE(p.pharmacies,'[]'::jsonb)) > 0 THEN p.pharmacies ELSE COALESCE(d.pharmacies, p.pharmacies) END,
  family_history = CASE WHEN jsonb_array_length(COALESCE(p.family_history,'[]'::jsonb)) > 0 THEN p.family_history ELSE COALESCE(d.family_history, p.family_history) END,
  organ_donor_organs = CASE WHEN jsonb_array_length(COALESCE(p.organ_donor_organs,'[]'::jsonb)) > 0 THEN p.organ_donor_organs ELSE COALESCE(d.organ_donor_organs, p.organ_donor_organs) END,
  current_medications = CASE WHEN jsonb_array_length(COALESCE(p.current_medications,'[]'::jsonb)) > 0 THEN p.current_medications ELSE COALESCE(d.current_medications, p.current_medications) END,
  conditions_diagnoses = CASE WHEN jsonb_array_length(COALESCE(p.conditions_diagnoses,'[]'::jsonb)) > 0 THEN p.conditions_diagnoses ELSE COALESCE(d.conditions_diagnoses, p.conditions_diagnoses) END,
  emergency_contacts = CASE WHEN jsonb_array_length(COALESCE(p.emergency_contacts,'[]'::jsonb)) > 0 THEN p.emergency_contacts ELSE COALESCE(d.emergency_contacts, p.emergency_contacts) END,
  next_of_kin_members = CASE WHEN jsonb_array_length(COALESCE(p.next_of_kin_members,'[]'::jsonb)) > 0 THEN p.next_of_kin_members ELSE COALESCE(d.next_of_kin_members, p.next_of_kin_members) END,
  is_chronic = COALESCE(p.is_chronic, d.is_chronic),
  updated_at = now()
FROM public.patients AS d
WHERE p.id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb'
  AND d.id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';

UPDATE public.sessions                     SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.appointments                 SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.todos                        SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.documents                    SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.patient_invitations          SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.prescriptions                SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.invoices                     SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.messages                     SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.round_table_notes            SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.patient_rewards              SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.patient_streaks              SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.health_photos                SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.session_drawings             SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.appointment_requests         SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.emoticon_messages            SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.image_comparisons            SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.hospital_admissions          SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.prescription_pill_references SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.round_table_topics           SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';
UPDATE public.medication_adherence         SET patient_id = '4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb' WHERE patient_id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';

UPDATE public.doctor_patient_access         SET patient_user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE patient_user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';
UPDATE public.doctor_patient_checkins       SET patient_user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE patient_user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';
UPDATE public.patient_profile_shares        SET owner_user_id   = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE owner_user_id   = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';
UPDATE public.patient_hidden_doctors        SET patient_user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE patient_user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';
UPDATE public.prescription_renewal_requests SET patient_user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE patient_user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';

UPDATE public.holarchelp_incidents          SET user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';
UPDATE public.holarchelp_incidents          SET triggered_by_user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE triggered_by_user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';
UPDATE public.holarchelp_emergency_contacts SET user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';
UPDATE public.notifications                 SET user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';
UPDATE public.todos                         SET user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';
UPDATE public.documents                     SET user_id = '96740682-20a5-4b6c-99a0-d26c5d4d20c9' WHERE user_id = 'cf9b1db5-eef9-46c8-9f5d-b571630355aa';

UPDATE public.patients SET
  name = 'Sharon Kennedy (archived)',
  first_name = 'Sharon',
  last_name = 'Kennedy (archived)',
  status = 'archived',
  updated_at = now()
WHERE id = 'bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7';


-- PART B: Human-readable incident_number
CREATE SEQUENCE IF NOT EXISTS public.holarchelp_incident_seq START WITH 1000 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.holarchelp_generate_incident_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'INC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.holarchelp_incident_seq')::text, 6, '0');
$$;

ALTER TABLE public.holarchelp_incidents ADD COLUMN IF NOT EXISTS incident_number text;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn,
         EXTRACT(YEAR FROM created_at)::int AS yr
    FROM public.holarchelp_incidents
   WHERE incident_number IS NULL
)
UPDATE public.holarchelp_incidents h
   SET incident_number = 'INC-' || o.yr || '-' || lpad(o.rn::text, 6, '0')
  FROM ordered o
 WHERE h.id = o.id;

SELECT setval('public.holarchelp_incident_seq', GREATEST(1000, (SELECT count(*) FROM public.holarchelp_incidents) + 1000));

CREATE OR REPLACE FUNCTION public.holarchelp_incident_number_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.incident_number IS NULL THEN
    NEW.incident_number := public.holarchelp_generate_incident_number();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_holarchelp_incident_number ON public.holarchelp_incidents;
CREATE TRIGGER trg_holarchelp_incident_number
BEFORE INSERT ON public.holarchelp_incidents
FOR EACH ROW EXECUTE FUNCTION public.holarchelp_incident_number_default();

CREATE UNIQUE INDEX IF NOT EXISTS holarchelp_incidents_incident_number_key
  ON public.holarchelp_incidents(incident_number);

ALTER TABLE public.holarchelp_incidents ALTER COLUMN incident_number SET NOT NULL;


-- PART C: Paramedic accept records destination hospital + notifies it
CREATE OR REPLACE FUNCTION public.holarchelp_paramedic_accept(
  _incident_id uuid,
  _ambulance_id uuid,
  _destination_hospital_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _provider_id uuid;
  _shift_id uuid;
  _updated uuid;
  _incident_number text;
  _hospital_name text;
  _hospital_owner uuid;
  _paramedic_name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT s.id, s.provider_id INTO _shift_id, _provider_id
    FROM public.paramedic_shifts s
   WHERE s.user_id = _uid
     AND s.ambulance_id = _ambulance_id
     AND s.ended_at IS NULL
     AND s.status = 'available'
   FOR UPDATE;

  IF _shift_id IS NULL THEN
    RAISE EXCEPTION 'You must start a shift with this ambulance and be available';
  END IF;

  UPDATE public.holarchelp_incidents
    SET assigned_provider_id = _provider_id,
        assigned_paramedic_user_id = _uid,
        assigned_ambulance_id = _ambulance_id,
        destination_hospital_id = COALESCE(_destination_hospital_id, destination_hospital_id),
        status = 'assigned',
        accepted_at = now()
    WHERE id = _incident_id
      AND assigned_paramedic_user_id IS NULL
      AND status IN ('open','reopened')
    RETURNING id, incident_number INTO _updated, _incident_number;

  IF _updated IS NULL THEN
    RAISE EXCEPTION 'Incident already taken';
  END IF;

  UPDATE public.ambulances SET status = 'assigned' WHERE id = _ambulance_id;

  UPDATE public.paramedic_shifts
    SET status = 'busy', current_incident_id = _incident_id
    WHERE id = _shift_id;

  INSERT INTO public.holarchelp_incident_offers(incident_id, provider_id, paramedic_user_id, response, responded_at)
    VALUES (_incident_id, _provider_id, _uid, 'accepted', now())
    ON CONFLICT (incident_id, provider_id) DO UPDATE
      SET response='accepted', responded_at=now(), paramedic_user_id=EXCLUDED.paramedic_user_id;

  UPDATE public.holarchelp_incident_offers
    SET response='superseded', responded_at=now()
    WHERE incident_id=_incident_id AND response='pending'
      AND (provider_id<>_provider_id OR paramedic_user_id<>_uid);

  INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _provider_id, _uid, 'paramedic_accepted',
            jsonb_build_object(
              'paramedic_user_id', _uid,
              'ambulance_id', _ambulance_id,
              'shift_id', _shift_id,
              'destination_hospital_id', _destination_hospital_id,
              'incident_number', _incident_number
            ));

  SELECT COALESCE(NULLIF(full_name,''), 'A paramedic') INTO _paramedic_name
    FROM public.profiles WHERE id = _uid;

  INSERT INTO public.notifications(user_id, type, title, body, metadata)
  SELECT i.user_id,
         'sos_accepted',
         'Ambulance dispatched',
         COALESCE(_paramedic_name,'A paramedic') || ' has accepted your SOS (' || _incident_number || ').',
         jsonb_build_object('incident_id', _incident_id, 'incident_number', _incident_number, 'paramedic_user_id', _uid)
    FROM public.holarchelp_incidents i
   WHERE i.id = _incident_id;

  IF _destination_hospital_id IS NOT NULL THEN
    SELECT name, owner_id INTO _hospital_name, _hospital_owner
      FROM public.holarchelp_hospitals WHERE id = _destination_hospital_id;

    IF _hospital_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, metadata)
      VALUES (
        _hospital_owner,
        'sos_incoming_hospital',
        'Incoming ambulance — ' || _incident_number,
        COALESCE(_paramedic_name,'A paramedic') || ' is bringing a patient to ' || COALESCE(_hospital_name, 'your hospital') || '.',
        jsonb_build_object(
          'incident_id', _incident_id,
          'incident_number', _incident_number,
          'destination_hospital_id', _destination_hospital_id,
          'ambulance_id', _ambulance_id
        )
      );
    END IF;

    INSERT INTO public.holarchelp_incident_events(incident_id, provider_id, actor_user_id, event_type, payload)
    VALUES (_incident_id, _provider_id, _uid, 'hospital_chosen',
            jsonb_build_object('destination_hospital_id', _destination_hospital_id, 'hospital_name', _hospital_name));
  END IF;

  RETURN jsonb_build_object(
    'locked', true,
    'provider_id', _provider_id,
    'ambulance_id', _ambulance_id,
    'incident_number', _incident_number,
    'destination_hospital_id', _destination_hospital_id
  );
END $$;
