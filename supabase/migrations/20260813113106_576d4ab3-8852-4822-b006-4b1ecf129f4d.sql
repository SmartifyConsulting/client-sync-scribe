CREATE TABLE public.biolog_biological_age_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  assessment_date date NOT NULL,
  chronological_age numeric,
  biological_age numeric,
  age_difference numeric GENERATED ALWAYS AS (biological_age - chronological_age) STORED,
  ageing_pace numeric,
  assessment_type text NOT NULL DEFAULT 'dna_methylation',
  model_name text,
  provider_name text,
  laboratory_name text,
  sample_type text,
  reference_population text,
  source text,
  report_path text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_biological_age_assessments TO authenticated;
GRANT ALL ON public.biolog_biological_age_assessments TO service_role;
ALTER TABLE public.biolog_biological_age_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ageing_assessments_owner_all"
  ON public.biolog_biological_age_assessments FOR ALL TO authenticated
  USING (patient_user_id = auth.uid())
  WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "ageing_assessments_shared_read"
  ON public.biolog_biological_age_assessments FOR SELECT TO authenticated
  USING (public.biolog_can_view(patient_user_id));

CREATE POLICY "ageing_assessments_clinician_write"
  ON public.biolog_biological_age_assessments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctor_patient_access dpa
      WHERE dpa.patient_user_id = biolog_biological_age_assessments.patient_user_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
        AND dpa.revoked_at IS NULL
    )
  );

CREATE POLICY "ageing_assessments_clinician_update"
  ON public.biolog_biological_age_assessments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_patient_access dpa
      WHERE dpa.patient_user_id = biolog_biological_age_assessments.patient_user_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
        AND dpa.revoked_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctor_patient_access dpa
      WHERE dpa.patient_user_id = biolog_biological_age_assessments.patient_user_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
        AND dpa.revoked_at IS NULL
    )
  );

CREATE TRIGGER update_biolog_ageing_assessments_updated_at
  BEFORE UPDATE ON public.biolog_biological_age_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_biolog_ageing_assessments_patient_date
  ON public.biolog_biological_age_assessments (patient_user_id, assessment_date DESC);

CREATE TABLE public.biolog_ageing_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  assessment_id uuid REFERENCES public.biolog_biological_age_assessments(id) ON DELETE SET NULL,
  insight_type text NOT NULL DEFAULT 'ageing',
  title text NOT NULL,
  description text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence text,
  status text NOT NULL DEFAULT 'active',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_ageing_insights TO authenticated;
GRANT ALL ON public.biolog_ageing_insights TO service_role;
ALTER TABLE public.biolog_ageing_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ageing_insights_owner_all"
  ON public.biolog_ageing_insights FOR ALL TO authenticated
  USING (patient_user_id = auth.uid())
  WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "ageing_insights_shared_read"
  ON public.biolog_ageing_insights FOR SELECT TO authenticated
  USING (public.biolog_can_view(patient_user_id));

CREATE TRIGGER update_biolog_ageing_insights_updated_at
  BEFORE UPDATE ON public.biolog_ageing_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_biolog_ageing_insights_patient
  ON public.biolog_ageing_insights (patient_user_id, generated_at DESC);

CREATE TABLE public.biolog_ageing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pace_slower_below numeric NOT NULL DEFAULT 0.95,
  pace_faster_above numeric NOT NULL DEFAULT 1.05,
  healthspan_improving_delta numeric NOT NULL DEFAULT -0.5,
  healthspan_attention_delta numeric NOT NULL DEFAULT 0.5,
  min_days_between_assessments integer NOT NULL DEFAULT 60,
  max_days_high_quality integer NOT NULL DEFAULT 730,
  min_daily_entries_for_insights integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.biolog_ageing_config TO authenticated;
GRANT ALL ON public.biolog_ageing_config TO service_role;
ALTER TABLE public.biolog_ageing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ageing_config_read"
  ON public.biolog_ageing_config FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "ageing_config_admin_write"
  ON public.biolog_ageing_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_biolog_ageing_config_updated_at
  BEFORE UPDATE ON public.biolog_ageing_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.biolog_ageing_config DEFAULT VALUES;

CREATE POLICY "ageing_reports_owner_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'biolog-ageing-reports'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.biolog_can_view(((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "ageing_reports_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'biolog-ageing-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "ageing_reports_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'biolog-ageing-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );