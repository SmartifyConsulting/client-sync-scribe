CREATE TABLE public.client_financial_profiles (
  patient_id uuid PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  cash_flow jsonb NOT NULL DEFAULT '{}',
  assets_liabilities jsonb NOT NULL DEFAULT '{}',
  risk_portfolio jsonb NOT NULL DEFAULT '{}',
  investments jsonb NOT NULL DEFAULT '{}',
  goals_risk jsonb NOT NULL DEFAULT '{}',
  estate jsonb NOT NULL DEFAULT '{}',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.client_financial_profiles TO authenticated;
GRANT ALL ON public.client_financial_profiles TO service_role;
ALTER TABLE public.client_financial_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View financial profile" ON public.client_financial_profiles FOR SELECT TO authenticated USING (public.can_view_patient_record(patient_id));
CREATE POLICY "Insert financial profile" ON public.client_financial_profiles FOR INSERT TO authenticated WITH CHECK (public.can_view_patient_record(patient_id));
CREATE POLICY "Update financial profile" ON public.client_financial_profiles FOR UPDATE TO authenticated USING (public.can_view_patient_record(patient_id)) WITH CHECK (public.can_view_patient_record(patient_id));
CREATE OR REPLACE FUNCTION public.cfp_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); NEW.updated_by = auth.uid(); RETURN NEW; END; $$;
CREATE TRIGGER cfp_touch BEFORE INSERT OR UPDATE ON public.client_financial_profiles FOR EACH ROW EXECUTE FUNCTION public.cfp_touch();
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS marital_regime text, ADD COLUMN IF NOT EXISTS industry text;