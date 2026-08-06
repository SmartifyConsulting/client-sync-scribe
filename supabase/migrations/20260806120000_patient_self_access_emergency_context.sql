-- Allow a patient to read their own emergency context via get_emergency_patient_context,
-- so the patient-facing read-only ward admission view (same bedside chart the hospital
-- sees) can render the Overview sub-tab instead of failing with "Not authorised".
CREATE OR REPLACE FUNCTION public.get_emergency_patient_context(_incident_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF NOT _allowed AND _incident.user_id = _uid THEN _allowed := true; END IF;
  IF NOT _allowed THEN RAISE EXCEPTION 'Not authorised'; END IF;

  SELECT id INTO _patient_id FROM public.patients
    WHERE patient_user_id = _incident.user_id
    ORDER BY created_at LIMIT 1;

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
        'full_name',          (SELECT full_name FROM public.profiles WHERE id = _incident.user_id),
        'mobile_number',      (SELECT mobile_number FROM public.profiles WHERE id = _incident.user_id),
        'preferred_language', (SELECT preferred_language FROM public.profiles WHERE id = _incident.user_id),
        'date_of_birth',      (SELECT dob::text FROM public.patients WHERE id = _patient_id),
        'gender',             (SELECT gender FROM public.patients WHERE id = _patient_id),
        'blood_type',         (SELECT blood_type FROM public.patients WHERE id = _patient_id),
        'allergies',          (SELECT allergies FROM public.patients WHERE id = _patient_id),
        'chronic_conditions', (SELECT conditions_diagnoses FROM public.patients WHERE id = _patient_id)
    ),
    'medications', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('medication', medication, 'dosage', dosage, 'frequency', frequency) ORDER BY created_at DESC)
      FROM public.prescriptions WHERE patient_id = _patient_id AND COALESCE(status,'active') = 'active'
    ), '[]'::jsonb),
    'emergency_contacts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'phone', phone, 'relationship', relationship))
      FROM public.holarchelp_emergency_contacts WHERE user_id = _incident.user_id
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
END $function$;
