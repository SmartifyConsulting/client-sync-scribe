CREATE TABLE public.client_life_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_date date NOT NULL DEFAULT current_date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.client_life_events TO authenticated;
GRANT ALL ON public.client_life_events TO service_role;
ALTER TABLE public.client_life_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view life events" ON public.client_life_events FOR SELECT TO authenticated USING (public.can_view_patient_record(patient_id));
CREATE POLICY "add life events" ON public.client_life_events FOR INSERT TO authenticated WITH CHECK (public.can_view_patient_record(patient_id) AND created_by = auth.uid());
CREATE POLICY "delete own life events" ON public.client_life_events FOR DELETE TO authenticated USING (created_by = auth.uid());
ALTER TABLE public.client_financial_profiles ADD COLUMN IF NOT EXISTS ai_summary text, ADD COLUMN IF NOT EXISTS ai_summary_updated_at timestamptz;