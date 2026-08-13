CREATE TABLE public.patient_relationship_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'not_started',
  pattern integer,
  confidence text,
  version text NOT NULL DEFAULT 'v1',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_relationship_profiles TO authenticated;
GRANT ALL ON public.patient_relationship_profiles TO service_role;
ALTER TABLE public.patient_relationship_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View relationship profile with record access"
ON public.patient_relationship_profiles FOR SELECT TO authenticated
USING (public.can_view_patient_record(patient_id));

CREATE POLICY "Patient creates own relationship profile"
ON public.patient_relationship_profiles FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND (p.patient_user_id = auth.uid() OR p.user_id = auth.uid())));

CREATE POLICY "Patient updates own relationship profile"
ON public.patient_relationship_profiles FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND (p.patient_user_id = auth.uid() OR p.user_id = auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND (p.patient_user_id = auth.uid() OR p.user_id = auth.uid())));

CREATE TRIGGER update_patient_relationship_profiles_updated_at
BEFORE UPDATE ON public.patient_relationship_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.patient_relationship_profile_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL,
  pattern integer,
  confidence text,
  version text NOT NULL DEFAULT 'v1',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.patient_relationship_profile_history TO authenticated;
GRANT ALL ON public.patient_relationship_profile_history TO service_role;
ALTER TABLE public.patient_relationship_profile_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View relationship history with record access"
ON public.patient_relationship_profile_history FOR SELECT TO authenticated
USING (public.can_view_patient_record(patient_id));

CREATE POLICY "Patient archives own relationship profile"
ON public.patient_relationship_profile_history FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND (p.patient_user_id = auth.uid() OR p.user_id = auth.uid())));

CREATE INDEX idx_rel_profile_history_patient ON public.patient_relationship_profile_history(patient_id, created_at DESC);