
-- 1. Extend status check
ALTER TABLE public.holarchelp_incidents DROP CONSTRAINT IF EXISTS holarchelp_incidents_status_check;
ALTER TABLE public.holarchelp_incidents ADD CONSTRAINT holarchelp_incidents_status_check
  CHECK (status = ANY (ARRAY['open','assigned','en_route','arrived','patient_collected','en_route_to_hospital','at_hospital','completed','reopened','cancelled']));

-- 2. New columns on incidents
ALTER TABLE public.holarchelp_incidents
  ADD COLUMN IF NOT EXISTS ai_emergency_summary text,
  ADD COLUMN IF NOT EXISTS hospital_admission_status text,
  ADD COLUMN IF NOT EXISTS triage_priority text,
  ADD COLUMN IF NOT EXISTS triage_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS admitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS pre_arrival_notes text,
  ADD COLUMN IF NOT EXISTS triage_bay text,
  ADD COLUMN IF NOT EXISTS triage_nurse text;

-- 3. Hospital capacity columns
ALTER TABLE public.holarchelp_hospitals
  ADD COLUMN IF NOT EXISTS er_capacity_status text NOT NULL DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS er_beds_available integer;
ALTER TABLE public.holarchelp_hospitals DROP CONSTRAINT IF EXISTS holarchelp_hospitals_er_capacity_check;
ALTER TABLE public.holarchelp_hospitals ADD CONSTRAINT holarchelp_hospitals_er_capacity_check
  CHECK (er_capacity_status IN ('green','yellow','red'));

-- 4. Emergency patient context RPC
CREATE OR REPLACE FUNCTION public.get_emergency_patient_context(_incident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _incident public.holarchelp_incidents;
  _allowed boolean := false;
  _patient_id uuid;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _incident FROM public.holarchelp_incidents WHERE id = _incident_id;
  IF _incident.id IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;

  IF public.has_role(_uid, 'admin'::user_role) THEN _allowed := true; END IF;
  IF NOT _allowed AND _incident.assigned_provider_id IS NOT NULL
     AND public.is_ambulance_staff(_incident.assigned_provider_id, _uid) THEN _allowed := true; END IF;
  IF NOT _allowed AND _incident.destination_hospital_id IS NOT NULL
     AND public.is_hospital_staff(_incident.destination_hospital_id, _uid) THEN _allowed := true; END IF;
  IF NOT _allowed THEN RAISE EXCEPTION 'Not authorised'; END IF;

  SELECT id INTO _patient_id FROM public.patients
    WHERE patient_user_id = _incident.user_id
    ORDER BY created_at LIMIT 1;

  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(p) - 'updated_at' FROM (
        SELECT full_name, date_of_birth, gender, blood_type, mobile_number, preferred_language, allergies, chronic_conditions
        FROM public.profiles WHERE id = _incident.user_id
      ) p),
    'medications', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('medication', medication, 'dosage', dosage, 'frequency', frequency, 'is_active', is_active))
      FROM public.prescriptions WHERE patient_id = _patient_id AND COALESCE(is_active, true) = true
      ORDER BY created_at DESC LIMIT 20
    ), '[]'::jsonb),
    'emergency_contacts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'phone', phone, 'relationship', relationship))
      FROM public.emergency_contacts WHERE user_id = _incident.user_id
    ), '[]'::jsonb),
    'voice_note_url', _incident.voice_note_audio_url,
    'voice_note_transcript', _incident.voice_note_transcript,
    'ai_summary', _incident.ai_emergency_summary,
    'severity', _incident.severity,
    'conscious', _incident.conscious,
    'breathing', _incident.breathing,
    'notes', _incident.notes,
    'linked_providers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', pr.full_name, 'specialty', pr.specialty))
      FROM public.doctor_patient_access dpa
      JOIN public.profiles pr ON pr.id = dpa.doctor_id
      WHERE dpa.patient_user_id = _incident.user_id AND dpa.is_active = true
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END $$;

-- 5. Notify hospital on destination set
CREATE OR REPLACE FUNCTION public.notify_hospital_inbound()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _staff record;
  _patient_name text;
BEGIN
  IF NEW.destination_hospital_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.destination_hospital_id IS NOT DISTINCT FROM NEW.destination_hospital_id THEN RETURN NEW; END IF;

  SELECT full_name INTO _patient_name FROM public.profiles WHERE id = NEW.user_id;

  FOR _staff IN
    SELECT user_id FROM (
      SELECT owner_id AS user_id FROM public.holarchelp_hospitals WHERE id = NEW.destination_hospital_id
      UNION
      SELECT user_id FROM public.holarchelp_hospital_members WHERE hospital_id = NEW.destination_hospital_id
    ) s WHERE user_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, type, title, description, reference_id)
    VALUES (_staff.user_id, 'hospital_inbound_patient',
            'Incoming patient',
            COALESCE(_patient_name, 'A patient') || ' is being transported to your ER (' || COALESCE(NEW.severity,'high') || ').',
            NEW.id);
  END LOOP;

  INSERT INTO public.holarchelp_incident_events(incident_id, actor_user_id, event_type, payload)
    VALUES (NEW.id, auth.uid(), 'destination_set', jsonb_build_object('hospital_id', NEW.destination_hospital_id));

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_hospital_inbound ON public.holarchelp_incidents;
CREATE TRIGGER trg_notify_hospital_inbound
AFTER UPDATE OF destination_hospital_id ON public.holarchelp_incidents
FOR EACH ROW EXECUTE FUNCTION public.notify_hospital_inbound();
