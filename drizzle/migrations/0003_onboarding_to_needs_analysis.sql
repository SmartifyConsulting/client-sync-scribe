CREATE OR REPLACE FUNCTION public.wealth_onboarding_refresh(_workflow_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE w record; ok boolean;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  IF w IS NULL OR w.current_stage <> 'consultation' OR w.status IN ('completed','closed_declined') THEN RETURN false; END IF;
  ok := EXISTS (SELECT 1 FROM wealth_kyc_checks WHERE workflow_id=_workflow_id AND status='approved')
    AND EXISTS (SELECT 1 FROM wealth_signed_documents WHERE workflow_id=_workflow_id AND doc_type='disclosure')
    AND EXISTS (SELECT 1 FROM wealth_signed_documents WHERE workflow_id=_workflow_id AND doc_type='loa');
  IF ok THEN
    PERFORM wealth_apply_stage(_workflow_id, 'needs_analysis', '[]'::jsonb, 'system',
      'Identity screening passed; disclosure and LOA signed', NULL, NULL, NULL);
  END IF;
  RETURN ok;
END $function$;