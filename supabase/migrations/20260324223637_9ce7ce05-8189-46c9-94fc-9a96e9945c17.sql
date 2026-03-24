CREATE TABLE public.image_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  image_urls text[] NOT NULL,
  image_labels text[],
  comparison_type text DEFAULT 'general',
  ai_analysis text,
  analyzed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.image_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage their comparisons"
  ON public.image_comparisons FOR ALL TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Patients can view their comparisons"
  ON public.image_comparisons FOR SELECT TO authenticated
  USING (patient_id IN (
    SELECT id FROM public.patients WHERE patient_user_id = auth.uid()
  ));