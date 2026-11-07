CREATE OR REPLACE FUNCTION public.wealth_sign_authorisations(_workflow_id uuid, _signer_id uuid, _recommendation_id uuid, _quote_snapshot jsonb, _documents jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE w public.wealth_workflows%ROWTYPE; c public.clients%ROWTYPE; r public.wealth_recommendations%ROWTYPE; cc public.wealth_compliance_checks%ROWTYPE; snapshot jsonb; item jsonb; signed_id uuid; filed_id uuid; ids jsonb := '[]'::jsonb;
BEGIN
 SELECT * INTO w FROM public.wealth_workflows WHERE id=_workflow_id FOR UPDATE;
 SELECT * INTO c FROM public.clients WHERE id=w.patient_id;
 IF _signer_id IS NULL OR c.patient_user_id IS DISTINCT FROM _signer_id THEN RAISE EXCEPTION 'Only the linked client can authorise and sign'; END IF;
 IF w.paused_at IS NOT NULL OR w.status IN ('cancelled','closed_declined') THEN RAISE EXCEPTION 'This workflow is not open for signing'; END IF;
 SELECT * INTO r FROM public.wealth_recommendations WHERE workflow_id=w.id ORDER BY version DESC LIMIT 1 FOR UPDATE;
 IF r.id IS DISTINCT FROM _recommendation_id OR r.status IS DISTINCT FROM 'accepted' THEN RAISE EXCEPTION 'Review and sign the current Record of Advice first'; END IF;
 SELECT * INTO cc FROM public.wealth_compliance_checks WHERE workflow_id=w.id FOR UPDATE;
 IF cc.kyc_fica_status IS DISTINCT FROM 'completed' OR (coalesce(cc.bank_validation_required,true) AND cc.bank_validation_status IS DISTINCT FROM 'completed') THEN RAISE EXCEPTION 'Complete FICA and bank confirmation first'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',q.id,'insurer',q.insurer,'product',q.product,'monthly_premium',q.monthly_premium) ORDER BY q.id),'[]'::jsonb) INTO snapshot FROM public.wealth_quotes q WHERE q.workflow_id=w.id AND q.selected;
 IF snapshot='[]'::jsonb OR snapshot IS DISTINCT FROM _quote_snapshot THEN RAISE EXCEPTION 'The selected premiums changed. Reload and review them before signing'; END IF;
 IF EXISTS (SELECT 1 FROM public.wealth_signed_documents WHERE workflow_id=w.id AND version=r.version AND doc_type IN ('debit_order','life_declaration')) THEN RAISE EXCEPTION 'These authorisations are already signed'; END IF;
 IF jsonb_array_length(_documents)<>2 OR NOT (_documents @> '[{"doc_type":"debit_order"},{"doc_type":"life_declaration"}]'::jsonb) THEN RAISE EXCEPTION 'Both signed declarations are required'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_documents) LOOP
  IF length(coalesce(item->>'signer_name',''))=0 OR length(coalesce(item->>'content_html',''))<20 OR item->>'seal_hash' !~ '^[a-f0-9]{64}$' OR item->>'content_hash' IS DISTINCT FROM encode(sha256(convert_to(item->>'content_html','UTF8')),'hex') THEN RAISE EXCEPTION 'Invalid signed document seal'; END IF;
  INSERT INTO public.wealth_signed_documents(workflow_id,patient_id,doc_type,version,title,content_html,content_hash,signature_image,signer_user_id,signer_name,signer_ip,user_agent,signed_at,seal_hash)
  VALUES(w.id,c.id,item->>'doc_type',r.version,item->>'title',item->>'content_html',item->>'content_hash',item->>'signature_image',_signer_id,item->>'signer_name',item->>'signer_ip',item->>'user_agent',(item->>'signed_at')::timestamptz,item->>'seal_hash') RETURNING id INTO signed_id;
  INSERT INTO public.documents(user_id,patient_id,patient_name,name,template_name,content,document_kind,record_date,is_draft)
  VALUES(w.owner_user_id,c.id,c.name,(item->>'title')||' (signed v'||r.version||')',item->>'title',item->>'filed_html',(item->>'doc_type')||'_signed',current_date,false) RETURNING id INTO filed_id;
  ids:=ids||jsonb_build_array(jsonb_build_object('signed_id',signed_id,'document_id',filed_id));
 END LOOP;
 INSERT INTO public.wealth_compliance_checks(workflow_id,declarations_status,declarations_completed_at) VALUES(w.id,'completed',now()) ON CONFLICT(workflow_id) DO UPDATE SET declarations_status='completed',declarations_completed_at=now(),updated_at=now();
 INSERT INTO public.wealth_audit_log(patient_id,actor_user_id,action,details,record_type,record_id) VALUES(c.id,_signer_id,'Client authorisations completed','Debit order mandate and life declaration signed for ROA version '||r.version,'workflow',w.id::text);
 PERFORM public.wealth_refresh(w.id,'signed_document',NULL);
 RETURN jsonb_build_object('documents',ids,'version',r.version);
END $function$;
REVOKE ALL ON FUNCTION public.wealth_sign_authorisations(uuid,uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wealth_sign_authorisations(uuid,uuid,uuid,jsonb,jsonb) TO service_role;