
CREATE TABLE public.medication_adherence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  taken_at timestamptz,
  proof_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, prescription_id, scheduled_date)
);
ALTER TABLE public.medication_adherence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own adherence" ON public.medication_adherence
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.patient_user_id = auth.uid()));

CREATE POLICY "Patients can insert own adherence" ON public.medication_adherence
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.patient_user_id = auth.uid()));

CREATE POLICY "Patients can update own adherence" ON public.medication_adherence
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.patient_user_id = auth.uid()));

CREATE POLICY "Doctors can view patient adherence" ON public.medication_adherence
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid()));

CREATE TABLE public.doctor_congratulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  streak_type text NOT NULL,
  streak_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_congratulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view their congratulations" ON public.doctor_congratulations
  FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can insert congratulations" ON public.doctor_congratulations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);
