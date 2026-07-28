-- Patient Test Results tab: blood work, radiology, X-rays etc., grouped by
-- date or test type, with submitting-party attribution and notifications to
-- both the patient and their doctor(s).

CREATE TABLE IF NOT EXISTS public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_type text NOT NULL CHECK (test_type IN ('blood', 'radiology', 'xray', 'other')),
  test_name text NOT NULL,
  result_date date NOT NULL DEFAULT CURRENT_DATE,
  content text,
  media_url text,
  submitted_by text NOT NULL,
  submitted_by_user_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_results_patient ON public.test_results(patient_id, result_date DESC);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own test results"
ON public.test_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = test_results.patient_id
      AND (p.patient_user_id = auth.uid() OR p.user_id = auth.uid())
  )
);

CREATE POLICY "Holarchy doctors can view patient test results"
ON public.test_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
    WHERE p.id = test_results.patient_id
      AND dpa.doctor_id = auth.uid()
      AND dpa.is_active = true
  )
);

CREATE POLICY "Patients and their doctors can add test results"
ON public.test_results
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = test_results.patient_id
        AND (p.patient_user_id = auth.uid() OR p.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
      WHERE p.id = test_results.patient_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
    )
  )
);

-- Sample data for Sharon Kennedy so the new tab has something to show.
DO $$
DECLARE
  _patient_id uuid;
  _doctor_id uuid;
BEGIN
  SELECT id INTO _patient_id FROM public.patients WHERE name ILIKE '%Sharon%Kennedy%' LIMIT 1;
  IF _patient_id IS NOT NULL THEN
    SELECT doctor_id INTO _doctor_id FROM public.doctor_patient_access
      WHERE patient_user_id = (SELECT patient_user_id FROM public.patients WHERE id = _patient_id)
      AND is_active = true LIMIT 1;

    INSERT INTO public.test_results (patient_id, test_type, test_name, result_date, content, submitted_by, submitted_by_user_id, created_by)
    VALUES
      (_patient_id, 'blood', 'Full Blood Count', CURRENT_DATE - INTERVAL '3 days', 'Hb 13.2 g/dL, WBC 6.1, Platelets 245 — all within normal range.', 'PathCare Laboratories', NULL, COALESCE(_doctor_id, _patient_id)),
      (_patient_id, 'blood', 'Lipogram', CURRENT_DATE - INTERVAL '10 days', 'Total cholesterol 4.8 mmol/L, LDL 2.6, HDL 1.4, Triglycerides 1.1 — normal.', 'PathCare Laboratories', NULL, COALESCE(_doctor_id, _patient_id)),
      (_patient_id, 'radiology', 'Chest X-Ray', CURRENT_DATE - INTERVAL '14 days', 'No acute cardiopulmonary abnormality. Lungs clear.', 'Dr Dean Allie', _doctor_id, COALESCE(_doctor_id, _patient_id)),
      (_patient_id, 'xray', 'Left Wrist X-Ray', CURRENT_DATE - INTERVAL '45 days', 'No fracture identified. Mild soft tissue swelling.', 'Life Radiology', NULL, COALESCE(_doctor_id, _patient_id))
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
