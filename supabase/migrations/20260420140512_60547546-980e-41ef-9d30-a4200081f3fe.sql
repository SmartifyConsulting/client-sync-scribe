-- Parent table: hospital_admissions
CREATE TABLE public.hospital_admissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  hospital TEXT,
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discharge_date DATE,
  diagnosis TEXT,
  procedure_description TEXT,
  status TEXT NOT NULL DEFAULT 'admitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_hospital_admissions_patient_id ON public.hospital_admissions(patient_id);
CREATE INDEX idx_hospital_admissions_doctor_id ON public.hospital_admissions(doctor_id);

ALTER TABLE public.hospital_admissions ENABLE ROW LEVEL SECURITY;

-- Helper: doctor has active access to patient (via patients.user_id ownership OR doctor_patient_access)
-- Patients can see their own admissions
CREATE POLICY "Patients can view their admissions"
  ON public.hospital_admissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = hospital_admissions.patient_id
      AND p.patient_user_id = auth.uid()
  ));

-- Doctors can view admissions they created or for patients they own/have access to
CREATE POLICY "Doctors can view admissions for their patients"
  ON public.hospital_admissions FOR SELECT
  USING (
    auth.uid() = doctor_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = hospital_admissions.patient_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.doctor_patient_access dpa
        ON dpa.patient_user_id = p.patient_user_id
      WHERE p.id = hospital_admissions.patient_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
    )
  );

CREATE POLICY "Doctors can insert admissions for their patients"
  ON public.hospital_admissions FOR INSERT
  WITH CHECK (
    auth.uid() = doctor_id
    AND (
      EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = hospital_admissions.patient_id
          AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.patients p
        JOIN public.doctor_patient_access dpa
          ON dpa.patient_user_id = p.patient_user_id
        WHERE p.id = hospital_admissions.patient_id
          AND dpa.doctor_id = auth.uid()
          AND dpa.is_active = true
      )
    )
  );

CREATE POLICY "Doctors can update admissions they manage"
  ON public.hospital_admissions FOR UPDATE
  USING (
    auth.uid() = doctor_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = hospital_admissions.patient_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.doctor_patient_access dpa
        ON dpa.patient_user_id = p.patient_user_id
      WHERE p.id = hospital_admissions.patient_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
    )
  );

CREATE POLICY "Doctors can delete admissions they created"
  ON public.hospital_admissions FOR DELETE
  USING (auth.uid() = doctor_id);

CREATE TRIGGER trg_hospital_admissions_updated_at
  BEFORE UPDATE ON public.hospital_admissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer helper for child table policies
CREATE OR REPLACE FUNCTION public.can_access_admission(_admission_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_admissions ha
    JOIN public.patients p ON p.id = ha.patient_id
    WHERE ha.id = _admission_id
      AND (
        p.patient_user_id = auth.uid()
        OR ha.doctor_id = auth.uid()
        OR p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.doctor_patient_access dpa
          WHERE dpa.patient_user_id = p.patient_user_id
            AND dpa.doctor_id = auth.uid()
            AND dpa.is_active = true
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_admission(_admission_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_admissions ha
    JOIN public.patients p ON p.id = ha.patient_id
    WHERE ha.id = _admission_id
      AND (
        ha.doctor_id = auth.uid()
        OR p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.doctor_patient_access dpa
          WHERE dpa.patient_user_id = p.patient_user_id
            AND dpa.doctor_id = auth.uid()
            AND dpa.is_active = true
        )
      )
  )
$$;

-- admission_vitals
CREATE TABLE public.admission_vitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admission_id UUID NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  heart_rate INTEGER,
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  spo2 NUMERIC,
  temperature_c NUMERIC,
  bmi NUMERIC,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_admission_vitals_admission_id ON public.admission_vitals(admission_id);
ALTER TABLE public.admission_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read vitals if can access admission"
  ON public.admission_vitals FOR SELECT
  USING (public.can_access_admission(admission_id));
CREATE POLICY "Insert vitals if can edit admission"
  ON public.admission_vitals FOR INSERT
  WITH CHECK (public.can_edit_admission(admission_id) AND recorded_by = auth.uid());
CREATE POLICY "Update vitals if can edit admission"
  ON public.admission_vitals FOR UPDATE
  USING (public.can_edit_admission(admission_id));
CREATE POLICY "Delete vitals if recorder"
  ON public.admission_vitals FOR DELETE
  USING (recorded_by = auth.uid());

-- admission_medications
CREATE TABLE public.admission_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admission_id UUID NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  started_at DATE,
  stopped_at DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_admission_medications_admission_id ON public.admission_medications(admission_id);
ALTER TABLE public.admission_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read meds if can access admission"
  ON public.admission_medications FOR SELECT
  USING (public.can_access_admission(admission_id));
CREATE POLICY "Insert meds if can edit admission"
  ON public.admission_medications FOR INSERT
  WITH CHECK (public.can_edit_admission(admission_id) AND recorded_by = auth.uid());
CREATE POLICY "Update meds if can edit admission"
  ON public.admission_medications FOR UPDATE
  USING (public.can_edit_admission(admission_id));
CREATE POLICY "Delete meds if recorder"
  ON public.admission_medications FOR DELETE
  USING (recorded_by = auth.uid());

CREATE TRIGGER trg_admission_medications_updated_at
  BEFORE UPDATE ON public.admission_medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- admission_lab_results
CREATE TABLE public.admission_lab_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admission_id UUID NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL,
  test_name TEXT NOT NULL,
  result_value TEXT,
  units TEXT,
  reference_range TEXT,
  result_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_admission_lab_results_admission_id ON public.admission_lab_results(admission_id);
ALTER TABLE public.admission_lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read labs if can access admission"
  ON public.admission_lab_results FOR SELECT
  USING (public.can_access_admission(admission_id));
CREATE POLICY "Insert labs if can edit admission"
  ON public.admission_lab_results FOR INSERT
  WITH CHECK (public.can_edit_admission(admission_id) AND recorded_by = auth.uid());
CREATE POLICY "Update labs if can edit admission"
  ON public.admission_lab_results FOR UPDATE
  USING (public.can_edit_admission(admission_id));
CREATE POLICY "Delete labs if recorder"
  ON public.admission_lab_results FOR DELETE
  USING (recorded_by = auth.uid());

CREATE TRIGGER trg_admission_lab_results_updated_at
  BEFORE UPDATE ON public.admission_lab_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- admission_imaging
CREATE TABLE public.admission_imaging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admission_id UUID NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL,
  modality TEXT NOT NULL,
  body_region TEXT,
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  pacs_link TEXT,
  attachment_url TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_admission_imaging_admission_id ON public.admission_imaging(admission_id);
ALTER TABLE public.admission_imaging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read imaging if can access admission"
  ON public.admission_imaging FOR SELECT
  USING (public.can_access_admission(admission_id));
CREATE POLICY "Insert imaging if can edit admission"
  ON public.admission_imaging FOR INSERT
  WITH CHECK (public.can_edit_admission(admission_id) AND recorded_by = auth.uid());
CREATE POLICY "Update imaging if can edit admission"
  ON public.admission_imaging FOR UPDATE
  USING (public.can_edit_admission(admission_id));
CREATE POLICY "Delete imaging if recorder"
  ON public.admission_imaging FOR DELETE
  USING (recorded_by = auth.uid());

CREATE TRIGGER trg_admission_imaging_updated_at
  BEFORE UPDATE ON public.admission_imaging
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();