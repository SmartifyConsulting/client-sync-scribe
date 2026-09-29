CREATE TABLE public.wealth_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.wealth_applications(id) ON DELETE SET NULL,
  claim_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'submitted',
  attachment_path text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wealth_claims TO authenticated;
GRANT ALL ON public.wealth_claims TO service_role;
ALTER TABLE public.wealth_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View claims for accessible clients" ON public.wealth_claims FOR SELECT TO authenticated
  USING (public.can_view_patient_record(patient_id));
CREATE POLICY "Log claims for accessible clients" ON public.wealth_claims FOR INSERT TO authenticated
  WITH CHECK (public.can_view_patient_record(patient_id) AND created_by = auth.uid());
CREATE POLICY "Update claims for accessible clients" ON public.wealth_claims FOR UPDATE TO authenticated
  USING (public.can_view_patient_record(patient_id)) WITH CHECK (public.can_view_patient_record(patient_id));
CREATE TRIGGER wealth_claims_touch BEFORE UPDATE ON public.wealth_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();