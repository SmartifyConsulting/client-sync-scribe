
CREATE TABLE public.patient_disc_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  dominance integer NOT NULL DEFAULT 0,
  influence integer NOT NULL DEFAULT 0,
  steadiness integer NOT NULL DEFAULT 0,
  conscientiousness integer NOT NULL DEFAULT 0,
  primary_trait text,
  secondary_trait text,
  dominance_rationale text,
  influence_rationale text,
  steadiness_rationale text,
  conscientiousness_rationale text,
  sessions_analyzed integer NOT NULL DEFAULT 0,
  last_session_id uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_disc_profiles TO authenticated;
GRANT ALL ON public.patient_disc_profiles TO service_role;

ALTER TABLE public.patient_disc_profiles ENABLE ROW LEVEL SECURITY;

-- Only doctors with active access to the patient may read
CREATE POLICY "Doctors with access can view patient DISC"
  ON public.patient_disc_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor')
    AND EXISTS (
      SELECT 1
      FROM public.doctor_patient_access dpa
      JOIN public.patients p ON p.patient_user_id = dpa.patient_user_id
      WHERE p.id = patient_disc_profiles.patient_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
    )
  );

CREATE POLICY "Doctors with access can insert patient DISC"
  ON public.patient_disc_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor')
    AND EXISTS (
      SELECT 1
      FROM public.doctor_patient_access dpa
      JOIN public.patients p ON p.patient_user_id = dpa.patient_user_id
      WHERE p.id = patient_disc_profiles.patient_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
    )
  );

CREATE POLICY "Doctors with access can update patient DISC"
  ON public.patient_disc_profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor')
    AND EXISTS (
      SELECT 1
      FROM public.doctor_patient_access dpa
      JOIN public.patients p ON p.patient_user_id = dpa.patient_user_id
      WHERE p.id = patient_disc_profiles.patient_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
    )
  );

CREATE TRIGGER update_patient_disc_profiles_updated_at
  BEFORE UPDATE ON public.patient_disc_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
