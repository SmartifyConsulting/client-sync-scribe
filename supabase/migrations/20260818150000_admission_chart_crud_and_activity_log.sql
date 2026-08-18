-- Generic CRUD entries for every section of the admitted-patient bedside
-- chart (observations, medications/fluids, notes, care plan, orders, etc.)
-- that previously had no data model behind them. Hospital staff (including
-- nurses) can create/edit/delete entries for admissions they can access.
CREATE TABLE public.hospital_admission_chart_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_inpatient_admissions(id) ON DELETE CASCADE,
  section text NOT NULL,
  author_id uuid,
  author_name text NOT NULL,
  author_role text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admission_chart_entries_admission ON public.hospital_admission_chart_entries(admission_id, section, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_admission_chart_entries TO authenticated;
GRANT ALL ON public.hospital_admission_chart_entries TO service_role;
ALTER TABLE public.hospital_admission_chart_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chart entries visible with admission"
  ON public.hospital_admission_chart_entries FOR SELECT TO authenticated
  USING (public.can_view_inpatient_admission(admission_id));
CREATE POLICY "chart entries created by hospital staff"
  ON public.hospital_admission_chart_entries FOR INSERT TO authenticated
  WITH CHECK (public.can_view_inpatient_admission(admission_id));
CREATE POLICY "chart entries updated by hospital staff"
  ON public.hospital_admission_chart_entries FOR UPDATE TO authenticated
  USING (public.can_view_inpatient_admission(admission_id))
  WITH CHECK (public.can_view_inpatient_admission(admission_id));
CREATE POLICY "chart entries deleted by hospital staff"
  ON public.hospital_admission_chart_entries FOR DELETE TO authenticated
  USING (public.can_view_inpatient_admission(admission_id));

-- Append-only activity trail — every CRUD action on an admission's chart
-- (vitals, chart entries, etc.) is logged here for a read-only audit view.
-- No UPDATE/DELETE policies at all, so it can never be edited from the app.
CREATE TABLE public.hospital_admission_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.holarchelp_hospitals(id) ON DELETE CASCADE,
  admission_id uuid REFERENCES public.hospital_inpatient_admissions(id) ON DELETE CASCADE,
  patient_name text,
  actor_id uuid,
  actor_name text NOT NULL,
  actor_role text,
  section text,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admission_activity_log_hospital ON public.hospital_admission_activity_log(hospital_id, created_at DESC);

GRANT SELECT, INSERT ON public.hospital_admission_activity_log TO authenticated;
GRANT ALL ON public.hospital_admission_activity_log TO service_role;
ALTER TABLE public.hospital_admission_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity log visible to hospital staff"
  ON public.hospital_admission_activity_log FOR SELECT TO authenticated
  USING (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "activity log written by hospital staff"
  ON public.hospital_admission_activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::user_role));
