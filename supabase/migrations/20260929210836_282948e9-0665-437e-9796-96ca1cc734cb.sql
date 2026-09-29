CREATE OR REPLACE FUNCTION public.wealth_blockers(_workflow_id uuid, _target_stage text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b jsonb := '[]'; c record; w record; acc boolean; pos int; roa_at timestamptz;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  IF w IS NULL THEN RETURN '["Workflow not found"]'; END IF;
  SELECT position INTO pos FROM wealth_workflow_stage_defs WHERE stage=_target_stage;
  SELECT * INTO c FROM wealth_compliance_checks WHERE workflow_id=_workflow_id;
  acc := EXISTS (SELECT 1 FROM wealth_recommendations WHERE workflow_id=_workflow_id AND status='accepted');
  IF coalesce(pos,0) BETWEEN 3 AND 15 THEN
    IF NOT wealth_has_doc(_workflow_id,'mandate_signed') THEN b := b || '["Client mandate (Form 1) not signed"]'; END IF;
    IF wealth_has_doc(_workflow_id,'fica_adverse') THEN b := b || '["Adverse FICA finding: client is high risk, onboarding stopped"]'; END IF;
  END IF;
  IF _target_stage='client_presentation' AND NOT EXISTS (SELECT 1 FROM wealth_recommendations WHERE workflow_id=_workflow_id AND status IN ('draft','presented')) THEN
    b := b || '["No current recommendation to present"]'; END IF;
  IF _target_stage='client_decision' AND NOT EXISTS (SELECT 1 FROM wealth_recommendations WHERE workflow_id=_workflow_id AND status='presented') THEN
    b := b || '["Recommendation has not been presented to the client"]'; END IF;
  IF _target_stage IN ('documentation','compliance','application','underwriting','submission') AND NOT acc THEN
    b := b || '["Recommendation not accepted by client"]'; END IF;
  IF _target_stage IN ('application','underwriting','submission') THEN
    IF c IS NULL OR c.kyc_fica_status<>'completed' THEN b := b || '["KYC/FICA not completed"]'; END IF;
    IF c IS NULL OR (c.bank_validation_required AND c.bank_validation_status<>'completed') THEN b := b || '["Bank validation not completed"]'; END IF;
    IF c IS NULL OR c.declarations_status<>'completed' THEN b := b || '["Required declarations not completed"]'; END IF;
    IF NOT wealth_has_doc(_workflow_id,'roa_signed') THEN b := b || '["Client signature on current ROA"]'; END IF;
    IF NOT wealth_has_doc(_workflow_id,'proof_of_residence') THEN b := b || '["Proof of residence"]'; END IF;
    IF NOT wealth_has_doc(_workflow_id,'id_document') THEN b := b || '["Client ID document"]'; END IF;
  END IF;
  IF _target_stage IN ('underwriting','submission','issued') THEN
    SELECT max(d.created_at) INTO roa_at FROM wealth_recommendations r JOIN documents d ON d.id=r.roa_document_id
      WHERE r.workflow_id=_workflow_id AND r.status='accepted' AND d.document_kind='roa_signed';
    IF roa_at IS NOT NULL AND EXISTS (SELECT 1 FROM wealth_applications WHERE workflow_id=_workflow_id AND submitted_at IS NOT NULL AND submitted_at < roa_at) THEN
      b := b || '["Application was submitted before the ROA was signed; resubmit"]'; END IF;
  END IF;
  IF _target_stage IN ('underwriting','submission') AND NOT EXISTS (SELECT 1 FROM wealth_applications WHERE workflow_id=_workflow_id AND status IN ('ready','underwriting','submitted','issued')) THEN
    b := b || '["Application not ready"]'; END IF;
  IF _target_stage='issued' AND NOT EXISTS (SELECT 1 FROM wealth_applications WHERE workflow_id=_workflow_id AND status IN ('submitted','issued')) THEN
    b := b || '["Application not submitted"]'; END IF;
  IF _target_stage IN ('follow_up','annual_review') AND NOT EXISTS (SELECT 1 FROM wealth_applications WHERE workflow_id=_workflow_id AND status='issued') THEN
    b := b || '["Provider has not confirmed issue"]'; END IF;
  RETURN b;
END $function$;