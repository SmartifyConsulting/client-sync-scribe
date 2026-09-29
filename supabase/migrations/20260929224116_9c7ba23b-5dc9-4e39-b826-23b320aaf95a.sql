CREATE TABLE public.wealth_kyc_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.wealth_workflows(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'didit',
  session_id text UNIQUE,
  session_url text,
  status text NOT NULL DEFAULT 'started',
  aml_result text,
  pep_result text,
  raw jsonb,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wealth_kyc_checks TO authenticated;
GRANT ALL ON public.wealth_kyc_checks TO service_role;
ALTER TABLE public.wealth_kyc_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View KYC checks for accessible clients" ON public.wealth_kyc_checks
  FOR SELECT TO authenticated USING (public.can_view_patient_record(patient_id));
CREATE TRIGGER wealth_kyc_checks_updated BEFORE UPDATE ON public.wealth_kyc_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.wealth_signed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.wealth_workflows(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('disclosure','loa')),
  version int NOT NULL DEFAULT 1,
  title text NOT NULL,
  content_html text NOT NULL,
  content_hash text NOT NULL,
  signature_image text NOT NULL,
  signer_user_id uuid NOT NULL,
  signer_name text NOT NULL,
  signer_ip text,
  user_agent text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  seal_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, doc_type, version)
);
GRANT SELECT ON public.wealth_signed_documents TO authenticated;
GRANT ALL ON public.wealth_signed_documents TO service_role;
ALTER TABLE public.wealth_signed_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View signed documents for accessible clients" ON public.wealth_signed_documents
  FOR SELECT TO authenticated USING (public.can_view_patient_record(patient_id));

-- Moves Step 1 forward only when identity screening passed and both documents are signed.
CREATE OR REPLACE FUNCTION public.wealth_onboarding_refresh(_workflow_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; ok boolean;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  IF w IS NULL OR w.current_stage <> 'consultation' OR w.status IN ('completed','closed_declined') THEN RETURN false; END IF;
  ok := EXISTS (SELECT 1 FROM wealth_kyc_checks WHERE workflow_id=_workflow_id AND status='approved')
    AND EXISTS (SELECT 1 FROM wealth_signed_documents WHERE workflow_id=_workflow_id AND doc_type='disclosure')
    AND EXISTS (SELECT 1 FROM wealth_signed_documents WHERE workflow_id=_workflow_id AND doc_type='loa');
  IF ok THEN
    PERFORM wealth_apply_stage(_workflow_id, 'information_required', '[]'::jsonb, 'system',
      'Identity screening passed; disclosure and LOA signed', NULL, NULL, NULL);
  END IF;
  RETURN ok;
END $$;
REVOKE EXECUTE ON FUNCTION public.wealth_onboarding_refresh(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wealth_onboarding_refresh(uuid) TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.wealth_kyc_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wealth_signed_documents;