-- Phase 1: Patient Identification & Lookup
-- Add patient_user_id to holarchelp_incidents to link SOS incidents to patient profiles

-- Add patient_user_id column to holarchelp_incidents
ALTER TABLE holarchelp_incidents
ADD COLUMN patient_user_id UUID REFERENCES profiles(id),
ADD COLUMN patient_name_cached VARCHAR;

-- Index for fast patient lookups
CREATE INDEX idx_holarchelp_incidents_patient_user_id
ON holarchelp_incidents(patient_user_id);

CREATE INDEX idx_holarchelp_incidents_patient_name
ON holarchelp_incidents(patient_name_cached);

-- Populate existing incidents with patient_user_id from user_id
UPDATE holarchelp_incidents
SET patient_user_id = user_id
WHERE patient_user_id IS NULL
AND user_id IS NOT NULL;

-- Populate patient_name_cached from profiles
UPDATE holarchelp_incidents h
SET patient_name_cached = p.full_name
FROM profiles p
WHERE h.patient_user_id = p.id
AND h.patient_name_cached IS NULL;

-- Create RLS policy for hospital staff to search patients
ALTER TABLE holarchelp_incidents ENABLE ROW LEVEL SECURITY;

-- Allow hospital staff to see patient via incident
CREATE POLICY "hospital_staff_can_view_patient_incidents"
ON holarchelp_incidents
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM holarchelp_ambulance_providers
    UNION
    SELECT user_id FROM holarchelp_hospital_staff
    WHERE role IN ('doctor', 'nurse', 'er_provider', 'admin')
  )
  OR destination_hospital_id IN (
    SELECT hospital_id FROM holarchelp_hospital_staff
    WHERE user_id = auth.uid()
  )
);

-- Create patient lookup function (callable from hospital staff context)
CREATE OR REPLACE FUNCTION search_patients_for_hospital(
  p_query TEXT,
  p_hospital_id UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  admission_status VARCHAR,
  admission_id UUID,
  incident_id UUID,
  incident_number VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.id as user_id,
    p.full_name,
    p.phone,
    p.email,
    COALESCE(ha.status, 'no_admission') as admission_status,
    ha.id as admission_id,
    hi.id as incident_id,
    hi.incident_number
  FROM profiles p
  LEFT JOIN hospital_inpatient_admissions ha
    ON p.id = ha.patient_user_id
    AND ha.hospital_id = p_hospital_id
    AND ha.status != 'discharged'
  LEFT JOIN holarchelp_incidents hi
    ON p.id = hi.patient_user_id
    AND hi.destination_hospital_id = p_hospital_id
    AND hi.status IN ('assigned', 'en_route', 'arrived', 'patient_collected', 'en_route_to_hospital', 'at_hospital')
  WHERE
    (p.full_name ILIKE '%' || p_query || '%'
     OR p.phone ILIKE '%' || p_query || '%'
     OR p.email ILIKE '%' || p_query || '%')
    AND p.deleted_at IS NULL
  ORDER BY
    CASE
      WHEN ha.status IN ('admitted', 'in_treatment') THEN 0
      WHEN hi.status IN ('en_route', 'arrived') THEN 1
      ELSE 2
    END,
    p.full_name
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create admission patient link function
CREATE OR REPLACE FUNCTION link_admission_to_patient(
  p_admission_id UUID,
  p_patient_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message VARCHAR,
  admission_id UUID
) AS $$
DECLARE
  v_admission_exists BOOLEAN;
  v_patient_exists BOOLEAN;
BEGIN
  -- Check if admission exists
  SELECT EXISTS(SELECT 1 FROM hospital_inpatient_admissions WHERE id = p_admission_id)
  INTO v_admission_exists;

  -- Check if patient exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_patient_user_id)
  INTO v_patient_exists;

  IF NOT v_admission_exists THEN
    RETURN QUERY SELECT FALSE, 'Admission not found', NULL::UUID;
    RETURN;
  END IF;

  IF NOT v_patient_exists THEN
    RETURN QUERY SELECT FALSE, 'Patient profile not found', NULL::UUID;
    RETURN;
  END IF;

  -- Update admission with patient link
  UPDATE hospital_inpatient_admissions
  SET patient_user_id = p_patient_user_id
  WHERE id = p_admission_id;

  -- Also update linked incident
  UPDATE holarchelp_incidents
  SET patient_user_id = p_patient_user_id
  WHERE incident_id IN (
    SELECT incident_id FROM hospital_inpatient_admissions WHERE id = p_admission_id
  );

  RETURN QUERY SELECT TRUE, 'Patient linked successfully', p_admission_id;
END;
$$ LANGUAGE plpgsql;

-- Audit logging for patient context access
CREATE TABLE IF NOT EXISTS patient_context_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID REFERENCES profiles(id),
  patient_user_id UUID REFERENCES profiles(id),
  hospital_id UUID REFERENCES holarchelp_hospitals(id),
  admission_id UUID,
  incident_id UUID,
  access_type VARCHAR, -- 'patient_search', 'view_context', 'view_labs', etc.
  accessed_at TIMESTAMP DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX idx_patient_context_access_log_staff
ON patient_context_access_log(staff_user_id);

CREATE INDEX idx_patient_context_access_log_patient
ON patient_context_access_log(patient_user_id);

-- RLS for audit log (staff can only see their own access logs)
ALTER TABLE patient_context_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_can_view_own_access_logs"
ON patient_context_access_log
FOR SELECT
USING (staff_user_id = auth.uid());
