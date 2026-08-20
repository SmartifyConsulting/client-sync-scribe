-- Phase 2: Patient Context Data
-- Create tables to store and link patient's medical history, allergies, labs, and imaging
-- This data will populate from the patient profile and be accessible to hospital staff

-- Patient Medical History (Conditions, Surgeries, etc.)
CREATE TABLE IF NOT EXISTS patient_medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  condition_name VARCHAR NOT NULL,
  diagnosed_date DATE,
  status VARCHAR DEFAULT 'active', -- 'active', 'resolved', 'chronic'
  notes TEXT,
  severity VARCHAR, -- 'mild', 'moderate', 'severe'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_patient_medical_history_patient
ON patient_medical_history(patient_user_id);

-- Patient Allergies
CREATE TABLE IF NOT EXISTS patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  allergen VARCHAR NOT NULL,
  allergen_type VARCHAR, -- 'medication', 'food', 'environmental', 'other'
  severity VARCHAR NOT NULL, -- 'mild', 'moderate', 'severe'
  reaction_description TEXT,
  date_reported DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_patient_allergies_patient
ON patient_allergies(patient_user_id);

CREATE INDEX idx_patient_allergies_severity
ON patient_allergies(patient_user_id, severity);

-- Patient Current Medications
CREATE TABLE IF NOT EXISTS patient_current_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_name VARCHAR NOT NULL,
  dosage VARCHAR,
  frequency VARCHAR,
  route VARCHAR, -- 'oral', 'iv', 'im', 'inhaled', etc.
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  indication VARCHAR, -- why they're taking it
  pharmacy_name VARCHAR,
  pharmacy_phone VARCHAR,
  status VARCHAR DEFAULT 'active', -- 'active', 'discontinued', 'on_hold'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_patient_current_medications_patient
ON patient_current_medications(patient_user_id);

CREATE INDEX idx_patient_current_medications_status
ON patient_current_medications(patient_user_id, status);

-- Patient Lab Results
CREATE TABLE IF NOT EXISTS patient_lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_name VARCHAR NOT NULL, -- 'CBC', 'BMP', 'Glucose', etc.
  result_value DECIMAL,
  unit VARCHAR, -- 'mg/dL', 'mmol/L', etc.
  normal_range_min DECIMAL,
  normal_range_max DECIMAL,
  lab_date DATE NOT NULL,
  lab_facility VARCHAR,
  status VARCHAR, -- 'normal', 'abnormal', 'critical'
  notes TEXT,
  attachment_url TEXT, -- link to lab report PDF
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_patient_lab_results_patient
ON patient_lab_results(patient_user_id, lab_date DESC);

CREATE INDEX idx_patient_lab_results_status
ON patient_lab_results(patient_user_id, status);

-- Patient Imaging Records (X-rays, CT scans, MRI, etc.)
CREATE TABLE IF NOT EXISTS patient_imaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  imaging_type VARCHAR NOT NULL, -- 'X-ray', 'CT', 'MRI', 'Ultrasound', 'PET', etc.
  body_region VARCHAR, -- 'Chest', 'Abdomen', 'Head', 'Spine', etc.
  imaging_date DATE NOT NULL,
  imaging_facility VARCHAR,
  report_text TEXT,
  findings_summary VARCHAR,
  dicom_url TEXT, -- Link to DICOM images if available
  pdf_report_url TEXT, -- Link to radiologist report
  radiologist_name VARCHAR,
  status VARCHAR DEFAULT 'completed', -- 'pending', 'completed', 'reviewed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_patient_imaging_patient
ON patient_imaging(patient_user_id, imaging_date DESC);

-- Drug Interaction Lookup Table
CREATE TABLE IF NOT EXISTS drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_1 VARCHAR NOT NULL,
  drug_2 VARCHAR NOT NULL,
  severity VARCHAR NOT NULL, -- 'mild', 'moderate', 'severe'
  interaction_description TEXT,
  clinical_effect TEXT,
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(drug_1, drug_2) -- Prevent duplicates
);

CREATE INDEX idx_drug_interactions_drug1
ON drug_interactions(LOWER(drug_1));

CREATE INDEX idx_drug_interactions_drug2
ON drug_interactions(LOWER(drug_2));

-- Populate common drug interactions
INSERT INTO drug_interactions (drug_1, drug_2, severity, interaction_description, clinical_effect, recommendation) VALUES
  ('Penicillin', 'Methotrexate', 'severe', 'Penicillin may reduce renal clearance of methotrexate', 'Risk of methotrexate toxicity', 'Monitor renal function and MTX levels'),
  ('Warfarin', 'Aspirin', 'severe', 'Increased anticoagulant and antiplatelet effects', 'Increased bleeding risk', 'Avoid concurrent use; use alternative antiplatelet agent'),
  ('ACE Inhibitor', 'NSAIDs', 'moderate', 'NSAIDs reduce antihypertensive effect of ACE inhibitors', 'Reduced blood pressure control, increased renal risk', 'Monitor BP, consider alternative to NSAID'),
  ('Lisinopril', 'NSAIDs', 'moderate', 'NSAIDs reduce antihypertensive effect', 'Reduced BP control', 'Use alternative pain reliever'),
  ('Metformin', 'Contrast Dye', 'severe', 'Risk of contrast-induced nephropathy', 'Acute kidney injury', 'Hold metformin 48 hours before and after contrast'),
  ('Simvastatin', 'Erythromycin', 'moderate', 'Increased statin levels via CYP3A4 inhibition', 'Risk of rhabdomyolysis', 'Use alternative antibiotic or reduce statin dose'),
  ('Clopidogrel', 'Omeprazole', 'moderate', 'Omeprazole inhibits CYP2C19 activation of clopidogrel', 'Reduced antiplatelet effect', 'Use alternative PPI like pantoprazole'),
  ('Lithium', 'NSAIDs', 'severe', 'NSAIDs reduce lithium clearance', 'Risk of lithium toxicity', 'Avoid NSAIDs, use acetaminophen instead'),
  ('Digoxin', 'Verapamil', 'severe', 'Increased digoxin levels via reduced clearance', 'Risk of digoxin toxicity', 'Monitor digoxin levels'),
  ('Theophylline', 'Ciprofloxacin', 'moderate', 'Reduced theophylline metabolism', 'Increased theophylline levels', 'Consider dose reduction or alternative antibiotic')
ON CONFLICT (drug_1, drug_2) DO NOTHING;

-- RPC Function: Get complete patient context for hospital staff
CREATE OR REPLACE FUNCTION get_patient_context(p_patient_user_id UUID)
RETURNS TABLE (
  medical_history JSONB,
  allergies JSONB,
  current_medications JSONB,
  recent_labs JSONB,
  recent_imaging JSONB,
  drug_interactions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Medical History
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pmh.id,
          'condition', pmh.condition_name,
          'status', pmh.status,
          'diagnosed_date', pmh.diagnosed_date,
          'severity', pmh.severity,
          'notes', pmh.notes
        ) ORDER BY pmh.diagnosed_date DESC
      ) FILTER (WHERE pmh.id IS NOT NULL),
      '[]'::jsonb
    ) AS medical_history,

    -- Allergies (CRITICAL - show all, especially severe)
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pa.id,
          'allergen', pa.allergen,
          'type', pa.allergen_type,
          'severity', pa.severity,
          'reaction', pa.reaction_description,
          'date_reported', pa.date_reported
        ) ORDER BY
          CASE pa.severity
            WHEN 'severe' THEN 0
            WHEN 'moderate' THEN 1
            ELSE 2
          END,
          pa.date_reported DESC
      ) FILTER (WHERE pa.id IS NOT NULL),
      '[]'::jsonb
    ) AS allergies,

    -- Current Medications
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pcm.id,
          'medication', pcm.medication_name,
          'dosage', pcm.dosage,
          'frequency', pcm.frequency,
          'route', pcm.route,
          'indication', pcm.indication,
          'pharmacy', pcm.pharmacy_name,
          'status', pcm.status
        ) ORDER BY pcm.start_date DESC
      ) FILTER (WHERE pcm.id IS NOT NULL AND pcm.status = 'active'),
      '[]'::jsonb
    ) AS current_medications,

    -- Recent Lab Results (last 6 months)
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', plr.id,
          'test', plr.test_name,
          'value', plr.result_value,
          'unit', plr.unit,
          'normal_min', plr.normal_range_min,
          'normal_max', plr.normal_range_max,
          'date', plr.lab_date,
          'status', plr.status,
          'facility', plr.lab_facility
        ) ORDER BY plr.lab_date DESC
      ) FILTER (WHERE plr.id IS NOT NULL AND plr.lab_date > CURRENT_DATE - INTERVAL '6 months'),
      '[]'::jsonb
    ) AS recent_labs,

    -- Recent Imaging (last year)
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'type', pi.imaging_type,
          'region', pi.body_region,
          'date', pi.imaging_date,
          'findings', pi.findings_summary,
          'report_url', pi.pdf_report_url,
          'dicom_url', pi.dicom_url
        ) ORDER BY pi.imaging_date DESC
      ) FILTER (WHERE pi.id IS NOT NULL AND pi.imaging_date > CURRENT_DATE - INTERVAL '1 year'),
      '[]'::jsonb
    ) AS recent_imaging,

    -- Drug Interactions for current meds
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'drug_1', di.drug_1,
          'drug_2', di.drug_2,
          'severity', di.severity,
          'effect', di.clinical_effect,
          'recommendation', di.recommendation
        )
      ) FILTER (WHERE di.id IS NOT NULL),
      '[]'::jsonb
    ) AS drug_interactions

  FROM
    patient_medical_history pmh
    FULL OUTER JOIN patient_allergies pa ON pa.patient_user_id = p_patient_user_id
    FULL OUTER JOIN patient_current_medications pcm ON pcm.patient_user_id = p_patient_user_id
    FULL OUTER JOIN patient_lab_results plr ON plr.patient_user_id = p_patient_user_id
    FULL OUTER JOIN patient_imaging pi ON pi.patient_user_id = p_patient_user_id
    FULL OUTER JOIN (
      -- Get interactions for patient's current meds
      SELECT di.*
      FROM drug_interactions di
      JOIN patient_current_medications pcm1 ON LOWER(di.drug_1) = LOWER(pcm1.medication_name)
      JOIN patient_current_medications pcm2 ON LOWER(di.drug_2) = LOWER(pcm2.medication_name)
      WHERE pcm1.patient_user_id = p_patient_user_id
      AND pcm2.patient_user_id = p_patient_user_id
      AND pcm1.status = 'active'
      AND pcm2.status = 'active'
      AND pcm1.id < pcm2.id -- Avoid duplicates
    ) di ON TRUE
  WHERE pmh.patient_user_id = p_patient_user_id
    OR pa.patient_user_id = p_patient_user_id
    OR pcm.patient_user_id = p_patient_user_id
    OR plr.patient_user_id = p_patient_user_id
    OR pi.patient_user_id = p_patient_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC Function: Check medication interaction
CREATE OR REPLACE FUNCTION check_medication_interaction(
  p_drug_1 VARCHAR,
  p_drug_2 VARCHAR
)
RETURNS TABLE (
  has_interaction BOOLEAN,
  severity VARCHAR,
  description TEXT,
  clinical_effect TEXT,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) > 0 AS has_interaction,
    COALESCE(MAX(di.severity), 'none') AS severity,
    MAX(di.interaction_description) AS description,
    MAX(di.clinical_effect) AS clinical_effect,
    MAX(di.recommendation) AS recommendation
  FROM drug_interactions di
  WHERE (LOWER(di.drug_1) = LOWER(p_drug_1) AND LOWER(di.drug_2) = LOWER(p_drug_2))
    OR (LOWER(di.drug_1) = LOWER(p_drug_2) AND LOWER(di.drug_2) = LOWER(p_drug_1));
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policies
ALTER TABLE patient_medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_current_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_imaging ENABLE ROW LEVEL SECURITY;

-- Allow hospital staff to view patient context only if admitted/incident at their hospital
CREATE POLICY "hospital_staff_can_view_patient_context"
ON patient_medical_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM holarchelp_hospital_staff hhs
    WHERE hhs.user_id = auth.uid()
    AND (
      -- Staff's hospital has patient's active admission
      EXISTS (
        SELECT 1 FROM hospital_inpatient_admissions hia
        WHERE hia.patient_user_id = patient_medical_history.patient_user_id
        AND hia.hospital_id = hhs.hospital_id
        AND hia.status IN ('admitted', 'in_treatment', 'in_emergency')
      )
      -- OR patient has active SOS incident at this hospital
      OR EXISTS (
        SELECT 1 FROM holarchelp_incidents hi
        WHERE hi.patient_user_id = patient_medical_history.patient_user_id
        AND hi.destination_hospital_id = hhs.hospital_id
        AND hi.status IN ('assigned', 'en_route', 'arrived', 'patient_collected', 'en_route_to_hospital', 'at_hospital')
      )
    )
  )
);

-- Apply same policy to all patient context tables
CREATE POLICY "hospital_staff_can_view_patient_allergies"
ON patient_allergies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM holarchelp_hospital_staff hhs
    WHERE hhs.user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM hospital_inpatient_admissions hia
        WHERE hia.patient_user_id = patient_allergies.patient_user_id
        AND hia.hospital_id = hhs.hospital_id
        AND hia.status IN ('admitted', 'in_treatment', 'in_emergency')
      )
      OR EXISTS (
        SELECT 1 FROM holarchelp_incidents hi
        WHERE hi.patient_user_id = patient_allergies.patient_user_id
        AND hi.destination_hospital_id = hhs.hospital_id
        AND hi.status IN ('assigned', 'en_route', 'arrived', 'patient_collected', 'en_route_to_hospital', 'at_hospital')
      )
    )
  )
);

CREATE POLICY "hospital_staff_can_view_patient_medications"
ON patient_current_medications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM holarchelp_hospital_staff hhs
    WHERE hhs.user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM hospital_inpatient_admissions hia
        WHERE hia.patient_user_id = patient_current_medications.patient_user_id
        AND hia.hospital_id = hhs.hospital_id
        AND hia.status IN ('admitted', 'in_treatment', 'in_emergency')
      )
      OR EXISTS (
        SELECT 1 FROM holarchelp_incidents hi
        WHERE hi.patient_user_id = patient_current_medications.patient_user_id
        AND hi.destination_hospital_id = hhs.hospital_id
        AND hi.status IN ('assigned', 'en_route', 'arrived', 'patient_collected', 'en_route_to_hospital', 'at_hospital')
      )
    )
  )
);

CREATE POLICY "hospital_staff_can_view_patient_labs"
ON patient_lab_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM holarchelp_hospital_staff hhs
    WHERE hhs.user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM hospital_inpatient_admissions hia
        WHERE hia.patient_user_id = patient_lab_results.patient_user_id
        AND hia.hospital_id = hhs.hospital_id
        AND hia.status IN ('admitted', 'in_treatment', 'in_emergency')
      )
      OR EXISTS (
        SELECT 1 FROM holarchelp_incidents hi
        WHERE hi.patient_user_id = patient_lab_results.patient_user_id
        AND hi.destination_hospital_id = hhs.hospital_id
        AND hi.status IN ('assigned', 'en_route', 'arrived', 'patient_collected', 'en_route_to_hospital', 'at_hospital')
      )
    )
  )
);

CREATE POLICY "hospital_staff_can_view_patient_imaging"
ON patient_imaging
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM holarchelp_hospital_staff hhs
    WHERE hhs.user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM hospital_inpatient_admissions hia
        WHERE hia.patient_user_id = patient_imaging.patient_user_id
        AND hia.hospital_id = hhs.hospital_id
        AND hia.status IN ('admitted', 'in_treatment', 'in_emergency')
      )
      OR EXISTS (
        SELECT 1 FROM holarchelp_incidents hi
        WHERE hi.patient_user_id = patient_imaging.patient_user_id
        AND hi.destination_hospital_id = hhs.hospital_id
        AND hi.status IN ('assigned', 'en_route', 'arrived', 'patient_collected', 'en_route_to_hospital', 'at_hospital')
      )
    )
  )
);
