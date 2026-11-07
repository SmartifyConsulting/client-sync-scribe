CREATE OR REPLACE FUNCTION public.wealth_has_doc(_wf uuid, _kind text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE
    WHEN _kind='roa_signed' THEN EXISTS (
      SELECT 1 FROM wealth_recommendations r JOIN documents d ON d.id=r.roa_document_id
      WHERE r.workflow_id=_wf AND r.status='accepted' AND d.document_kind='roa_signed')
    WHEN _kind='mandate_signed' THEN
      EXISTS (SELECT 1 FROM wealth_workflows w JOIN documents d ON d.patient_id=w.patient_id WHERE w.id=_wf AND d.document_kind='mandate_signed')
      OR (EXISTS (SELECT 1 FROM wealth_workflows w JOIN documents d ON d.patient_id=w.patient_id WHERE w.id=_wf AND d.document_kind='disclosure_signed')
          AND EXISTS (SELECT 1 FROM wealth_workflows w JOIN documents d ON d.patient_id=w.patient_id WHERE w.id=_wf AND d.document_kind='loa_signed'))
    WHEN _kind='id_document' THEN
      EXISTS (SELECT 1 FROM wealth_workflows w JOIN documents d ON d.patient_id=w.patient_id WHERE w.id=_wf AND d.document_kind='id_document')
      OR EXISTS (SELECT 1 FROM wealth_workflows w JOIN wealth_kyc_checks k ON k.patient_id=w.patient_id WHERE w.id=_wf AND k.status='approved')
    ELSE EXISTS (SELECT 1 FROM wealth_workflows w JOIN documents d ON d.patient_id=w.patient_id WHERE w.id=_wf AND d.document_kind=_kind)
  END
$$;

CREATE OR REPLACE FUNCTION public.wealth_upload_fica_document(_workflow_id uuid, _kind text, _name text, _data_url text, _mime text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record; doc_id uuid; has_por boolean; has_bank boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT wealth_is_workflow_party(_workflow_id, auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _kind NOT IN ('proof_of_residence','bank_letter') THEN RAISE EXCEPTION 'Unsupported document type'; END IF;
  IF _data_url IS NULL OR length(_data_url) > 7500000 THEN RAISE EXCEPTION 'File missing or larger than 5MB'; END IF;
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  INSERT INTO documents (user_id, patient_id, name, template_name, content, media_url, media_type, document_kind, record_date, is_draft)
  VALUES (w.owner_user_id, w.patient_id, left(coalesce(_name,'FICA document'),200),
          CASE WHEN _kind='proof_of_residence' THEN 'Proof of Residential Address' ELSE 'Bank Account Verification Letter' END,
          '', _data_url, _mime, _kind, current_date, false)
  RETURNING id INTO doc_id;
  INSERT INTO wealth_compliance_checks (workflow_id) VALUES (_workflow_id) ON CONFLICT DO NOTHING;
  has_por := wealth_has_doc(_workflow_id,'proof_of_residence');
  has_bank := wealth_has_doc(_workflow_id,'bank_letter');
  UPDATE wealth_compliance_checks SET
    kyc_fica_status = CASE WHEN has_por AND wealth_has_doc(_workflow_id,'id_document') THEN 'completed' ELSE kyc_fica_status END,
    kyc_fica_completed_at = CASE WHEN has_por AND wealth_has_doc(_workflow_id,'id_document') AND kyc_fica_status<>'completed' THEN now() ELSE kyc_fica_completed_at END,
    bank_validation_status = CASE WHEN has_bank THEN 'completed' ELSE bank_validation_status END,
    bank_validation_completed_at = CASE WHEN has_bank AND bank_validation_status<>'completed' THEN now() ELSE bank_validation_completed_at END,
    updated_at = now()
  WHERE workflow_id=_workflow_id;
  PERFORM wealth_refresh(_workflow_id, 'document', doc_id);
  RETURN jsonb_build_object('document_id', doc_id, 'proof_of_residence', has_por, 'bank_letter', has_bank);
END $$;
REVOKE EXECUTE ON FUNCTION public.wealth_upload_fica_document(uuid,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wealth_upload_fica_document(uuid,text,text,text,text) TO authenticated;