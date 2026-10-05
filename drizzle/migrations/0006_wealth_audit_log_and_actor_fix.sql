ALTER TABLE public.wealth_workflow_transitions DROP CONSTRAINT wealth_workflow_transitions_actor_type_check;
ALTER TABLE public.wealth_workflow_transitions ADD CONSTRAINT wealth_workflow_transitions_actor_type_check
  CHECK (actor_type = ANY (ARRAY['user','system','client','advisor','admin']));

CREATE OR REPLACE FUNCTION public.wealth_apply_stage(_workflow_id uuid, _stage text, _blockers jsonb, _actor text, _reason text, _rtype text, _rid uuid, _decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id FOR UPDATE;
  IF w.current_stage IS DISTINCT FROM _stage THEN
    INSERT INTO wealth_workflow_transitions(workflow_id,from_stage,to_stage,actor_type,actor_user_id,reason,related_record_type,related_record_id,decision)
    VALUES (_workflow_id,w.current_stage,_stage,_actor,CASE WHEN _actor<>'system' THEN auth.uid() END,_reason,_rtype,_rid,_decision);
  END IF;
  UPDATE wealth_workflows SET current_stage=_stage, blockers=COALESCE(_blockers,'[]'),
    status=CASE WHEN status IN ('closed_declined','completed') THEN status
                WHEN jsonb_array_length(COALESCE(_blockers,'[]'))>0 THEN 'blocked' ELSE 'active' END
  WHERE id=_workflow_id;
END $$;

CREATE TABLE public.wealth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  details text,
  record_type text,
  record_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wealth_audit_log TO authenticated;
GRANT ALL ON public.wealth_audit_log TO service_role;
ALTER TABLE public.wealth_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View audit log for accessible clients" ON public.wealth_audit_log FOR SELECT TO authenticated
  USING (public.can_view_patient_record(patient_id));
CREATE INDEX wealth_audit_log_patient_idx ON public.wealth_audit_log(patient_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.wealth_audit(_patient uuid, _action text, _details text, _type text, _id text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO wealth_audit_log(patient_id, actor_user_id, action, details, record_type, record_id)
  VALUES (_patient, auth.uid(), _action, _details, _type, _id);
$$;
REVOKE EXECUTE ON FUNCTION public.wealth_audit(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.wealth_audit_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF TG_TABLE_NAME = 'wealth_workflow_transitions' THEN
    SELECT patient_id INTO pid FROM wealth_workflows WHERE id = NEW.workflow_id;
    PERFORM wealth_audit(pid, 'Stage changed', coalesce(NEW.from_stage,'start') || ' → ' || NEW.to_stage || coalesce(' · ' || NEW.reason,''), 'workflow', NEW.workflow_id::text);
  ELSIF TG_TABLE_NAME = 'wealth_signed_documents' THEN
    PERFORM wealth_audit(NEW.patient_id, 'Document signed', NEW.title || ' signed by ' || NEW.signer_name || coalesce(' from IP ' || NEW.signer_ip,'') || ' · seal ' || left(NEW.seal_hash,12), 'signed_document', NEW.id::text);
  ELSIF TG_TABLE_NAME = 'wealth_kyc_checks' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM wealth_audit(NEW.patient_id, 'KYC screening started', 'Didit identity, AML and PEP screening started', 'kyc', NEW.id::text);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM wealth_audit(NEW.patient_id, 'KYC status changed', OLD.status || ' → ' || NEW.status || coalesce(' · AML ' || NEW.aml_result,'') || coalesce(' · PEP ' || NEW.pep_result,''), 'kyc', NEW.id::text);
    END IF;
  ELSIF TG_TABLE_NAME = 'client_financial_profiles' THEN
    IF TG_OP = 'UPDATE' AND NEW.verified_at IS NOT NULL AND OLD.verified_at IS NULL THEN
      PERFORM wealth_audit(NEW.patient_id, 'Financial information confirmed', 'Client confirmed it is complete and correct', 'financial_profile', NEW.patient_id::text);
    ELSIF NEW.extracted_at IS DISTINCT FROM (CASE WHEN TG_OP='UPDATE' THEN OLD.extracted_at END) AND NEW.extracted_at IS NOT NULL THEN
      PERFORM wealth_audit(NEW.patient_id, 'Financial information captured', 'Captured from consultation by AI', 'financial_profile', NEW.patient_id::text);
    ELSIF TG_OP = 'UPDATE' AND (NEW.cash_flow, NEW.assets_liabilities, NEW.risk_portfolio, NEW.investments, NEW.goals_risk, NEW.estate)
          IS DISTINCT FROM (OLD.cash_flow, OLD.assets_liabilities, OLD.risk_portfolio, OLD.investments, OLD.goals_risk, OLD.estate) THEN
      PERFORM wealth_audit(NEW.patient_id, 'Financial information edited', NULL, 'financial_profile', NEW.patient_id::text);
    END IF;
  ELSIF TG_TABLE_NAME = 'sessions' THEN
    PERFORM wealth_audit(NEW.patient_id, 'Consultation recorded', coalesce(NEW.title,'Consultation') || ' transcript saved', 'session', NEW.id::text);
  ELSIF TG_TABLE_NAME = 'appointments' THEN
    IF NEW.patient_id IS NOT NULL THEN
      PERFORM wealth_audit(NEW.patient_id, CASE WHEN TG_OP='INSERT' THEN 'Meeting booked' ELSE 'Meeting changed' END, to_char(NEW.start_time AT TIME ZONE 'Africa/Johannesburg','DD Mon YYYY HH24:MI'), 'appointment', NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER wealth_audit_transitions AFTER INSERT ON public.wealth_workflow_transitions FOR EACH ROW EXECUTE FUNCTION public.wealth_audit_trg();
CREATE TRIGGER wealth_audit_signed AFTER INSERT ON public.wealth_signed_documents FOR EACH ROW EXECUTE FUNCTION public.wealth_audit_trg();
CREATE TRIGGER wealth_audit_kyc AFTER INSERT OR UPDATE ON public.wealth_kyc_checks FOR EACH ROW EXECUTE FUNCTION public.wealth_audit_trg();
CREATE TRIGGER wealth_audit_fin AFTER INSERT OR UPDATE ON public.client_financial_profiles FOR EACH ROW EXECUTE FUNCTION public.wealth_audit_trg();
CREATE TRIGGER wealth_audit_sessions AFTER INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.wealth_audit_trg();
CREATE TRIGGER wealth_audit_appts AFTER INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.wealth_audit_trg();

INSERT INTO public.wealth_audit_log(patient_id, actor_user_id, action, details, record_type, record_id, created_at)
SELECT w.patient_id, t.actor_user_id, 'Stage changed', coalesce(t.from_stage,'start') || ' → ' || t.to_stage || coalesce(' · ' || t.reason,''), 'workflow', t.workflow_id::text, t.created_at
FROM public.wealth_workflow_transitions t JOIN public.wealth_workflows w ON w.id = t.workflow_id
UNION ALL
SELECT patient_id, signer_user_id, 'Document signed', title || ' signed by ' || signer_name, 'signed_document', id::text, signed_at FROM public.wealth_signed_documents
UNION ALL
SELECT patient_id, user_id, 'Consultation recorded', coalesce(title,'Consultation') || ' transcript saved', 'session', id::text, created_at FROM public.sessions WHERE transcript IS NOT NULL AND patient_id IN (SELECT patient_id FROM public.wealth_workflows);