CREATE OR REPLACE FUNCTION public.wealth_confirm_financial_information(_client_id uuid, _waiver_scope text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.clients%ROWTYPE;
        verified timestamptz;
        scope text := nullif(btrim(_waiver_scope), '');
        body text;
BEGIN
  SELECT * INTO c FROM public.clients WHERE id = _client_id AND patient_user_id = auth.uid();
  IF c.id IS NULL THEN RAISE EXCEPTION 'Only the linked client can confirm this information'; END IF;
  IF _waiver_scope IS NOT NULL AND (scope IS NULL OR length(scope) > 500) THEN
    RAISE EXCEPTION 'Describe the need you want advice on in 500 characters or fewer';
  END IF;
  SELECT verified_at INTO verified FROM public.client_financial_profiles WHERE patient_id = c.id FOR UPDATE;
  IF verified IS NOT NULL THEN RETURN true; END IF;
  PERFORM public.wealth_financials_verify(c.id);
  IF scope IS NOT NULL THEN
    body := format(E'Client: %s\n\nI confirm the information I supplied is complete and correct for the advice requested. I decline a full financial needs analysis and understand that other needs may go unidentified.\n\nScope of advice: %s\n\nConfirmed by the linked client on %s SAST.',
      c.name, scope, to_char(now() AT TIME ZONE 'Africa/Johannesburg', 'DD Mon YYYY HH24:MI:SS'));
    INSERT INTO public.documents (user_id, patient_id, patient_name, name, template_name, content, document_kind, record_date)
    VALUES (c.user_id, c.id, c.name, 'Limited Advice Waiver', 'Financial Information Confirmation',
      '<div id="holarc-document" style="padding:32px;font-family:Arial;line-height:1.6"><h2>Limited Advice Waiver</h2><p>'
      || replace(replace(replace(replace(body, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), E'\n', '<br/>') || '</p></div>',
      'fna_disclaimer', (now() AT TIME ZONE 'Africa/Johannesburg')::date);
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.wealth_current_broker(_client_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'name', coalesce(nullif(btrim(w.planner_name), ''), nullif(btrim(p.full_name), ''), 'Linked broker'),
    'firm', w.fsp_name, 'licence', w.fsb_licence, 'email', w.email_primary, 'phone', coalesce(w.phone, w.firm_phone)
  )
  FROM public.clients c
  LEFT JOIN public.wealth_practice_info w ON w.user_id = c.user_id
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE c.id = _client_id AND c.patient_user_id = auth.uid() AND c.user_id <> c.patient_user_id
$$;

CREATE OR REPLACE FUNCTION public.wealth_request_broker_change(
  _client_id uuid, _request_id uuid, _new_broker text, _new_firm text, _policies text, _signature text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.clients%ROWTYPE;
        broker jsonb;
        body text;
BEGIN
  SELECT * INTO c FROM public.clients WHERE id = _client_id AND patient_user_id = auth.uid();
  IF c.id IS NULL THEN RAISE EXCEPTION 'Only the linked client can file a broker change request'; END IF;
  IF _request_id IS NULL OR nullif(btrim(_new_broker), '') IS NULL OR length(_new_broker) > 200
    OR nullif(btrim(_new_firm), '') IS NULL OR length(_new_firm) > 200
    OR nullif(btrim(_policies), '') IS NULL OR length(_policies) > 1000
    OR nullif(btrim(_signature), '') IS NULL OR length(_signature) > 200 THEN
    RAISE EXCEPTION 'Enter the new broker, firm, policy details and your full name';
  END IF;
  broker := public.wealth_current_broker(c.id);
  body := format(E'Client: %s\nCurrent broker: %s\nNew broker: %s\nNew firm or FSP: %s\nInsurers and policy numbers: %s\n\nI request that the named broker be appointed for the policies listed above.\n\nElectronically signed by %s on %s SAST.',
    c.name, coalesce(broker->>'name', 'None linked'), btrim(_new_broker), btrim(_new_firm), btrim(_policies),
    btrim(_signature), to_char(now() AT TIME ZONE 'Africa/Johannesburg', 'DD Mon YYYY HH24:MI:SS'));
  INSERT INTO public.documents (id, user_id, patient_id, patient_name, name, template_name, content, document_kind, record_date)
  VALUES (_request_id, c.user_id, c.id, c.name, 'Broker Change Letter', 'Broker Change Letter',
    '<div id="holarc-document" style="padding:32px;font-family:Arial;line-height:1.6"><h2>Broker Change Letter</h2><p>'
    || replace(replace(replace(replace(body, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), E'\n', '<br/>') || '</p></div>',
    'broker_change', (now() AT TIME ZONE 'Africa/Johannesburg')::date)
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE id = _request_id AND patient_id = c.id AND document_kind = 'broker_change') THEN
    RAISE EXCEPTION 'This request could not be filed';
  END IF;
  RETURN _request_id;
END $$;

REVOKE ALL ON FUNCTION public.wealth_confirm_financial_information(uuid, text), public.wealth_current_broker(uuid), public.wealth_request_broker_change(uuid, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wealth_confirm_financial_information(uuid, text), public.wealth_current_broker(uuid), public.wealth_request_broker_change(uuid, uuid, text, text, text, text) TO authenticated;
