CREATE OR REPLACE FUNCTION public.can_view_patient_record(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = _patient_id
      AND (
        p.user_id = auth.uid()
        OR p.patient_user_id = auth.uid()
        OR (
          p.patient_user_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.doctor_patient_access dpa
            WHERE dpa.patient_user_id = p.patient_user_id
              AND dpa.doctor_id = auth.uid()
              AND dpa.is_active = true
          )
        )
        OR public.assistant_of_doctor(auth.uid(), p.user_id)
      )
  )
$$;

-- ---------------------------------------------------------------- journal
CREATE TABLE public.patient_emotional_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  body text NOT NULL,
  font_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_emotional_journal TO authenticated;
GRANT ALL ON public.patient_emotional_journal TO service_role;

ALTER TABLE public.patient_emotional_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients read their own journal"
  ON public.patient_emotional_journal FOR SELECT TO authenticated
  USING (patient_user_id = auth.uid());

CREATE POLICY "Patients write their own journal"
  ON public.patient_emotional_journal FOR INSERT TO authenticated
  WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Patients update their own journal"
  ON public.patient_emotional_journal FOR UPDATE TO authenticated
  USING (patient_user_id = auth.uid())
  WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Patients delete their own journal"
  ON public.patient_emotional_journal FOR DELETE TO authenticated
  USING (patient_user_id = auth.uid());

CREATE INDEX idx_emotional_journal_owner ON public.patient_emotional_journal (patient_user_id, entry_date DESC);

-- --------------------------------------------------------------- insights
CREATE TABLE public.patient_emotional_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES public.patient_emotional_journal(id) ON DELETE CASCADE,
  summation text,
  theme text,
  metaphysical_note text,
  source_entry_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.patient_emotional_insights TO authenticated;
GRANT ALL ON public.patient_emotional_insights TO service_role;

ALTER TABLE public.patient_emotional_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient reads own emotional insights"
  ON public.patient_emotional_insights FOR SELECT TO authenticated
  USING (
    patient_user_id = auth.uid()
    OR (patient_id IS NOT NULL AND public.can_view_patient_record(patient_id))
  );

CREATE INDEX idx_emotional_insights_owner ON public.patient_emotional_insights (patient_user_id, generated_at DESC);
CREATE INDEX idx_emotional_insights_entry ON public.patient_emotional_insights (entry_id);

-- --------------------------------------------------------- timeline cache
CREATE TABLE public.patient_history_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  timeline jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_fingerprint text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_history_timelines TO authenticated;
GRANT ALL ON public.patient_history_timelines TO service_role;

ALTER TABLE public.patient_history_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Care team reads cached timeline"
  ON public.patient_history_timelines FOR SELECT TO authenticated
  USING (public.can_view_patient_record(patient_id));

CREATE POLICY "Care team writes cached timeline"
  ON public.patient_history_timelines FOR INSERT TO authenticated
  WITH CHECK (public.can_view_patient_record(patient_id));

CREATE POLICY "Care team updates cached timeline"
  ON public.patient_history_timelines FOR UPDATE TO authenticated
  USING (public.can_view_patient_record(patient_id))
  WITH CHECK (public.can_view_patient_record(patient_id));

-- ---------------------------------------------------------------- triggers
CREATE TRIGGER update_patient_emotional_journal_updated_at
  BEFORE UPDATE ON public.patient_emotional_journal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_emotional_insights_updated_at
  BEFORE UPDATE ON public.patient_emotional_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_history_timelines_updated_at
  BEFORE UPDATE ON public.patient_history_timelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();