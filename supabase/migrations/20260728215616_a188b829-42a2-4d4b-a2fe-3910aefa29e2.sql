
CREATE OR REPLACE FUNCTION public.biolog_can_view(_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doctor_patient_access dpa
      WHERE dpa.patient_user_id = _owner
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
        AND dpa.revoked_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.patient_profile_shares s
      WHERE s.owner_user_id = _owner
        AND s.shared_with_user_id = auth.uid()
        AND s.can_view_profile = true
        AND (s.view_scopes IS NULL OR s.view_scopes @> '["biolog"]'::jsonb)
    );
$$;

CREATE TABLE public.biolog_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  group_name text NOT NULL DEFAULT 'physical',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_sections TO authenticated;
GRANT ALL ON public.biolog_sections TO service_role;
ALTER TABLE public.biolog_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biolog_sections_owner_all" ON public.biolog_sections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "biolog_sections_shared_read" ON public.biolog_sections FOR SELECT TO authenticated
  USING (public.biolog_can_view(user_id));

CREATE TABLE public.biolog_section_order (
  user_id uuid PRIMARY KEY,
  block_order text[] NOT NULL DEFAULT ARRAY['wellbeing','meals','exercise','medication']::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_section_order TO authenticated;
GRANT ALL ON public.biolog_section_order TO service_role;
ALTER TABLE public.biolog_section_order ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biolog_section_order_owner_all" ON public.biolog_section_order FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.biolog_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_foods TO authenticated;
GRANT ALL ON public.biolog_foods TO service_role;
ALTER TABLE public.biolog_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biolog_foods_owner_all" ON public.biolog_foods FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "biolog_foods_shared_read" ON public.biolog_foods FOR SELECT TO authenticated
  USING (public.biolog_can_view(user_id));

CREATE TABLE public.biolog_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  unit text NOT NULL DEFAULT 'minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_exercises TO authenticated;
GRANT ALL ON public.biolog_exercises TO service_role;
ALTER TABLE public.biolog_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biolog_exercises_owner_all" ON public.biolog_exercises FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "biolog_exercises_shared_read" ON public.biolog_exercises FOR SELECT TO authenticated
  USING (public.biolog_can_view(user_id));

CREATE TABLE public.biolog_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  dose_amount numeric,
  dose_unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_medications TO authenticated;
GRANT ALL ON public.biolog_medications TO service_role;
ALTER TABLE public.biolog_medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biolog_medications_owner_all" ON public.biolog_medications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "biolog_medications_shared_read" ON public.biolog_medications FOR SELECT TO authenticated
  USING (public.biolog_can_view(user_id));

CREATE TABLE public.biolog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT (now()::date),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_entries TO authenticated;
GRANT ALL ON public.biolog_entries TO service_role;
ALTER TABLE public.biolog_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biolog_entries_owner_all" ON public.biolog_entries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "biolog_entries_shared_read" ON public.biolog_entries FOR SELECT TO authenticated
  USING (public.biolog_can_view(user_id));

CREATE TABLE public.biolog_correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  group_name text NOT NULL DEFAULT 'custom',
  input_variable text NOT NULL,
  outcome_variables text[] NOT NULL DEFAULT '{}'::text[],
  enabled boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_correlations TO authenticated;
GRANT ALL ON public.biolog_correlations TO service_role;
ALTER TABLE public.biolog_correlations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biolog_correlations_owner_all" ON public.biolog_correlations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "biolog_correlations_shared_read" ON public.biolog_correlations FOR SELECT TO authenticated
  USING (public.biolog_can_view(user_id));

CREATE TABLE public.biolog_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'mixed',
  duration_days integer NOT NULL DEFAULT 30,
  targets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_programmes TO authenticated;
GRANT ALL ON public.biolog_programmes TO service_role;
ALTER TABLE public.biolog_programmes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biolog_programmes_creator_all" ON public.biolog_programmes FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE TABLE public.biolog_programme_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.biolog_programmes(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  start_date date NOT NULL DEFAULT (now()::date),
  end_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biolog_programme_assignments TO authenticated;
GRANT ALL ON public.biolog_programme_assignments TO service_role;
ALTER TABLE public.biolog_programme_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biolog_assignments_patient_all" ON public.biolog_programme_assignments FOR ALL TO authenticated
  USING (patient_user_id = auth.uid()) WITH CHECK (patient_user_id = auth.uid());
CREATE POLICY "biolog_assignments_viewer_read" ON public.biolog_programme_assignments FOR SELECT TO authenticated
  USING (public.biolog_can_view(patient_user_id) OR assigned_by = auth.uid());
CREATE POLICY "biolog_assignments_provider_write" ON public.biolog_programme_assignments FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid() AND public.biolog_can_view(patient_user_id));
CREATE POLICY "biolog_assignments_provider_update" ON public.biolog_programme_assignments FOR UPDATE TO authenticated
  USING (assigned_by = auth.uid()) WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "biolog_programmes_assigned_read" ON public.biolog_programmes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.biolog_programme_assignments a
    WHERE a.programme_id = biolog_programmes.id
      AND (a.patient_user_id = auth.uid() OR public.biolog_can_view(a.patient_user_id))
  ));

CREATE TRIGGER biolog_sections_updated_at BEFORE UPDATE ON public.biolog_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER biolog_entries_updated_at BEFORE UPDATE ON public.biolog_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER biolog_programmes_updated_at BEFORE UPDATE ON public.biolog_programmes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER biolog_assignments_updated_at BEFORE UPDATE ON public.biolog_programme_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_biolog_entries_user_date ON public.biolog_entries (user_id, entry_date DESC);
CREATE INDEX idx_biolog_assignments_patient ON public.biolog_programme_assignments (patient_user_id, status);
