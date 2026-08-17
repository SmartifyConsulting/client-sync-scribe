-- Vitals recorded against a ward inpatient admission (hospital_inpatient_admissions),
-- distinct from the session-based admission_vitals used on the doctor's
-- session/consultation flow. Lets nurses record and review vitals for the
-- patients on their ward from the bedside chart / patient record screen.
CREATE TABLE public.hospital_inpatient_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_inpatient_admissions(id) ON DELETE CASCADE,
  recorded_by uuid,
  recorded_by_name text,
  heart_rate integer,
  bp_systolic integer,
  bp_diastolic integer,
  spo2 integer,
  temperature_c numeric(4,1),
  respiratory_rate integer,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inpatient_vitals_admission ON public.hospital_inpatient_vitals(admission_id, recorded_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_inpatient_vitals TO authenticated;
GRANT ALL ON public.hospital_inpatient_vitals TO service_role;

ALTER TABLE public.hospital_inpatient_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inpatient vitals visible with admission"
  ON public.hospital_inpatient_vitals FOR SELECT TO authenticated
  USING (public.can_view_inpatient_admission(admission_id));

CREATE POLICY "inpatient vitals recorded by hospital staff"
  ON public.hospital_inpatient_vitals FOR INSERT TO authenticated
  WITH CHECK (public.can_view_inpatient_admission(admission_id));

CREATE POLICY "inpatient vitals managed by hospital staff"
  ON public.hospital_inpatient_vitals FOR UPDATE TO authenticated
  USING (public.can_view_inpatient_admission(admission_id))
  WITH CHECK (public.can_view_inpatient_admission(admission_id));

CREATE POLICY "inpatient vitals deleted by hospital staff"
  ON public.hospital_inpatient_vitals FOR DELETE TO authenticated
  USING (public.can_view_inpatient_admission(admission_id));
