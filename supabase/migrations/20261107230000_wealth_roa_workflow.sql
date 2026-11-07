CREATE OR REPLACE FUNCTION public.wealth_file_roa(
  _workflow_id uuid, _version integer, _content text, _summary text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w public.wealth_workflows%ROWTYPE;
  c public.clients%ROWTYPE;
  r public.wealth_recommendations%ROWTYPE;
  doc_id uuid;
  next_version integer;
BEGIN
  SELECT * INTO w FROM public.wealth_workflows WHERE id = _workflow_id FOR UPDATE;
  SELECT * INTO c FROM public.clients WHERE id = w.patient_id;
  IF auth.uid() IS NULL OR w.id IS NULL OR c.patient_user_id = auth.uid()
    OR (auth.uid() IS DISTINCT FROM w.owner_user_id AND auth.uid() IS DISTINCT FROM c.user_id)
    OR NOT public.can_view_patient_record(w.patient_id) THEN
    RAISE EXCEPTION 'Only the assigned adviser can file this Record of Advice';
  END IF;
  IF _content IS NULL OR length(_content) > 6000000 OR position('<!--roa-body-->' IN _content) = 0
    OR nullif(btrim(_summary), '') IS NULL THEN
    RAISE EXCEPTION 'Complete the Record of Advice first';
  END IF;
  SELECT * INTO r FROM public.wealth_recommendations WHERE workflow_id = w.id ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF r.status IN ('accepted', 'declined') THEN RAISE EXCEPTION 'This advice has already been decided'; END IF;
  next_version := CASE WHEN r.status = 'draft' AND r.roa_document_id IS NULL THEN r.version ELSE coalesce(r.version, 0) + 1 END;
  IF _version IS DISTINCT FROM next_version THEN RAISE EXCEPTION 'The advice version changed. Refresh before filing'; END IF;
  INSERT INTO public.documents (user_id, patient_id, patient_name, name, template_name, content, document_kind, record_date)
  VALUES (c.user_id, c.id, c.name, 'Record of Advice v' || next_version, 'Record of Advice', _content, 'roa', (now() AT TIME ZONE 'Africa/Johannesburg')::date)
  RETURNING id INTO doc_id;
  IF r.status = 'draft' AND r.roa_document_id IS NULL THEN
    UPDATE public.wealth_recommendations SET roa_document_id = doc_id, summary = _summary, title = 'Record of Advice' WHERE id = r.id;
    RETURN r.id;
  END IF;
  IF r.id IS NOT NULL THEN UPDATE public.wealth_recommendations SET status = 'superseded' WHERE id = r.id; END IF;
  INSERT INTO public.wealth_recommendations (workflow_id, version, title, summary, roa_document_id, supersedes_id)
  VALUES (w.id, next_version, 'Record of Advice', _summary, doc_id, r.id) RETURNING id INTO r.id;
  RETURN r.id;
END $$;

CREATE OR REPLACE FUNCTION public.wealth_sign_roa(
  _recommendation_id uuid, _document_id uuid, _name text, _content_hash text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w public.wealth_workflows%ROWTYPE;
  c public.clients%ROWTYPE;
  r public.wealth_recommendations%ROWTYPE;
  d public.documents%ROWTYPE;
  doc_id uuid;
  signed_at timestamptz := clock_timestamp();
  signer text;
  stamp text;
BEGIN
  SELECT wf.* INTO w FROM public.wealth_workflows wf JOIN public.wealth_recommendations rec
    ON rec.workflow_id = wf.id WHERE rec.id = _recommendation_id FOR UPDATE OF wf;
  SELECT * INTO c FROM public.clients WHERE id = w.patient_id;
  IF auth.uid() IS NULL OR c.patient_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the linked client can sign this Record of Advice';
  END IF;
  SELECT * INTO r FROM public.wealth_recommendations WHERE workflow_id = w.id ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF r.id IS DISTINCT FROM _recommendation_id OR r.status <> 'presented'
    OR r.roa_document_id IS DISTINCT FROM _document_id THEN
    RAISE EXCEPTION 'This version is no longer available to sign. Reload and review the current Record of Advice';
  END IF;
  SELECT * INTO d FROM public.documents WHERE id = _document_id AND patient_id = c.id AND document_kind = 'roa' FOR SHARE;
  IF nullif(btrim(d.content), '') IS NULL OR nullif(btrim(_name), '') IS NULL OR length(_name) > 200 THEN
    RAISE EXCEPTION 'Open the Record of Advice and enter your full name before signing';
  END IF;
  IF encode(sha256(convert_to(d.content, 'UTF8')), 'hex') IS DISTINCT FROM _content_hash THEN
    RAISE EXCEPTION 'The document changed. Reload and review it before signing';
  END IF;
  signer := replace(replace(replace(btrim(_name), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
  stamp := '<section style="margin:24px 0"><h3>Client acknowledgement and acceptance</h3>'
    || '<p>I confirm I received and reviewed this Record of Advice and accept the recommendation recorded in this version.</p><p><strong>'
    || signer || '</strong> · Electronically signed '
    || to_char(signed_at AT TIME ZONE 'Africa/Johannesburg', 'DD Mon YYYY HH24:MI:SS') || ' SAST'
    || ' · Version ' || r.version || '</p></section>';
  INSERT INTO public.documents (user_id, patient_id, patient_name, name, template_name, content, document_kind, record_date)
  VALUES (c.user_id, c.id, c.name, 'Record of Advice v' || r.version || ' (signed)', 'Record of Advice',
    CASE WHEN position('<!--/roa-body-->' IN d.content) > 0 THEN replace(d.content, '<!--/roa-body-->', stamp || '<!--/roa-body-->')
    ELSE regexp_replace(d.content, '(</div>[[:space:]]*)$', stamp || '\1') END, 'roa_signed', (signed_at AT TIME ZONE 'Africa/Johannesburg')::date)
  RETURNING id INTO doc_id;
  UPDATE public.wealth_recommendations SET roa_document_id = doc_id WHERE id = r.id;
  PERFORM public.wealth_record_decision(r.id, 'accepted', 'Client signed Record of Advice version ' || r.version);
  RETURN doc_id;
END $$;

REVOKE ALL ON FUNCTION public.wealth_file_roa(uuid, integer, text, text), public.wealth_sign_roa(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wealth_file_roa(uuid, integer, text, text), public.wealth_sign_roa(uuid, uuid, text, text) TO authenticated;
