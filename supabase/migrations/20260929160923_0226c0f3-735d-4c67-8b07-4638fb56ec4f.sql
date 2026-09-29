
CREATE TABLE public.wealth_workflow_stage_defs (
  stage text PRIMARY KEY, position int NOT NULL, label text NOT NULL, owner_role text NOT NULL,
  required_info text[] NOT NULL DEFAULT '{}', required_documents text[] NOT NULL DEFAULT '{}',
  dependencies text[] NOT NULL DEFAULT '{}', next_stages text[] NOT NULL DEFAULT '{}');
GRANT SELECT ON public.wealth_workflow_stage_defs TO authenticated;
GRANT ALL ON public.wealth_workflow_stage_defs TO service_role;
ALTER TABLE public.wealth_workflow_stage_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage defs readable" ON public.wealth_workflow_stage_defs FOR SELECT TO authenticated USING (true);

INSERT INTO public.wealth_workflow_stage_defs VALUES
('consultation',1,'Consultation','wealth_manager','{}','{}','{}','{information_required}'),
('information_required',2,'Information Required','client','{financial_information}','{id_document}','{consultation}','{needs_analysis}'),
('needs_analysis',3,'Needs Analysis','wealth_manager','{needs_analysis}','{}','{information_required}','{research_quotes}'),
('research_quotes',4,'Research / Quotes','wealth_manager','{}','{}','{needs_analysis}','{recommendation}'),
('recommendation',5,'Recommendation','wealth_manager','{recommendation}','{roa}','{research_quotes}','{client_presentation}'),
('client_presentation',6,'Client Presentation','wealth_manager','{}','{roa}','{recommendation}','{client_decision}'),
('client_decision',7,'Client Decision','client','{client_decision}','{}','{client_presentation}','{documentation,recommendation,closed_declined}'),
('documentation',8,'Documentation','client','{}','{roa_signed,proof_of_residence,id_document}','{client_decision}','{compliance}'),
('compliance',9,'Compliance','key_individual','{kyc_fica,bank_validation,declarations}','{}','{documentation}','{application}'),
('application',10,'Application','wealth_manager','{}','{roa_signed,proof_of_residence}','{compliance}','{underwriting}'),
('underwriting',11,'Underwriting','provider','{}','{}','{application}','{submission}'),
('submission',12,'Submission','operations','{}','{}','{underwriting}','{issued}'),
('issued',13,'Issued','provider','{}','{}','{submission}','{follow_up}'),
('follow_up',14,'Follow-up','wealth_manager','{}','{}','{issued}','{annual_review}'),
('annual_review',15,'Annual Review','wealth_manager','{}','{}','{follow_up}','{consultation}'),
('closed_declined',99,'Closed / Declined','system','{}','{}','{client_decision}','{}');

CREATE TABLE public.wealth_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practice_id uuid REFERENCES public.practices(id) ON DELETE SET NULL,
  owner_user_id uuid NOT NULL DEFAULT auth.uid(),
  current_stage text NOT NULL DEFAULT 'consultation' REFERENCES public.wealth_workflow_stage_defs(stage),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','closed_declined','completed')),
  blockers jsonb NOT NULL DEFAULT '[]',
  cycle_number int NOT NULL DEFAULT 1,
  previous_workflow_id uuid REFERENCES public.wealth_workflows(id),
  consultation_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  annual_review_appointment_id uuid,
  next_review_date date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX wealth_workflows_one_active ON public.wealth_workflows(patient_id) WHERE status IN ('active','blocked');
GRANT SELECT, INSERT, UPDATE ON public.wealth_workflows TO authenticated;
GRANT ALL ON public.wealth_workflows TO service_role;
ALTER TABLE public.wealth_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ww select" ON public.wealth_workflows FOR SELECT TO authenticated USING (public.can_view_patient_record(patient_id));
CREATE POLICY "ww insert" ON public.wealth_workflows FOR INSERT TO authenticated WITH CHECK (public.can_view_patient_record(patient_id) AND current_stage='consultation');

CREATE TABLE public.wealth_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.wealth_workflows(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  title text, summary text,
  roa_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','presented','accepted','declined','changes_requested','superseded')),
  presented_at timestamptz, decided_at timestamptz, decision_reason text,
  supersedes_id uuid REFERENCES public.wealth_recommendations(id),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version));

CREATE TABLE public.wealth_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.wealth_workflows(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.wealth_recommendations(id),
  product text, provider text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','underwriting','submitted','issued')),
  submitted_at timestamptz, issued_at timestamptz, review_date date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.wealth_compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL UNIQUE REFERENCES public.wealth_workflows(id) ON DELETE CASCADE,
  kyc_fica_status text NOT NULL DEFAULT 'pending', kyc_fica_completed_at timestamptz,
  bank_validation_required boolean NOT NULL DEFAULT true,
  bank_validation_status text NOT NULL DEFAULT 'pending', bank_validation_completed_at timestamptz,
  declarations_status text NOT NULL DEFAULT 'pending', declarations_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.wealth_workflow_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.wealth_workflows(id) ON DELETE CASCADE,
  from_stage text, to_stage text NOT NULL,
  actor_type text NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user','system')),
  actor_user_id uuid, reason text,
  related_record_type text, related_record_id uuid, decision text,
  created_at timestamptz NOT NULL DEFAULT now());

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['wealth_recommendations','wealth_applications','wealth_compliance_checks'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated; GRANT ALL ON public.%I TO service_role; ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t,t,t);
    EXECUTE format('CREATE POLICY "%s access" ON public.%I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.wealth_workflows w WHERE w.id=workflow_id AND public.can_view_patient_record(w.patient_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.wealth_workflows w WHERE w.id=workflow_id AND public.can_view_patient_record(w.patient_id)))', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP; END $$;
CREATE TRIGGER wealth_workflows_updated BEFORE UPDATE ON public.wealth_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.wealth_workflow_transitions TO authenticated;
GRANT ALL ON public.wealth_workflow_transitions TO service_role;
ALTER TABLE public.wealth_workflow_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wt select" ON public.wealth_workflow_transitions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wealth_workflows w WHERE w.id=workflow_id AND public.can_view_patient_record(w.patient_id)));

-- Recommendation history is immutable once decided
CREATE OR REPLACE FUNCTION public.wealth_protect_recommendation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.status IN ('accepted','declined','changes_requested','superseded')
     AND (NEW.summary IS DISTINCT FROM OLD.summary OR NEW.title IS DISTINCT FROM OLD.title OR NEW.roa_document_id IS DISTINCT FROM OLD.roa_document_id OR NEW.version<>OLD.version) THEN
    RAISE EXCEPTION 'Decided recommendation versions cannot be edited; create a new version';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER wealth_rec_protect BEFORE UPDATE ON public.wealth_recommendations FOR EACH ROW EXECUTE FUNCTION public.wealth_protect_recommendation();

ALTER TABLE public.todos
  ADD COLUMN workflow_id uuid REFERENCES public.wealth_workflows(id) ON DELETE SET NULL,
  ADD COLUMN workflow_stage text,
  ADD COLUMN owner_role text CHECK (owner_role IS NULL OR owner_role IN ('client','wealth_manager','firm','key_individual','provider','operations','system')),
  ADD COLUMN recommendation_id uuid REFERENCES public.wealth_recommendations(id) ON DELETE SET NULL,
  ADD COLUMN application_id uuid REFERENCES public.wealth_applications(id) ON DELETE SET NULL,
  ADD COLUMN product text;
ALTER TABLE public.documents ADD COLUMN document_kind text;

-- Engine ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wealth_has_doc(_wf uuid, _kind text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN _kind='roa_signed' THEN EXISTS (
      SELECT 1 FROM wealth_recommendations r JOIN documents d ON d.id=r.roa_document_id
      WHERE r.workflow_id=_wf AND r.status='accepted' AND d.document_kind='roa_signed')
    ELSE EXISTS (SELECT 1 FROM wealth_workflows w JOIN documents d ON d.patient_id=w.patient_id
      WHERE w.id=_wf AND d.document_kind=_kind) END
$$;

CREATE OR REPLACE FUNCTION public.wealth_blockers(_workflow_id uuid, _target_stage text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE b jsonb := '[]'; c record; w record; acc boolean;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  IF w IS NULL THEN RETURN '["Workflow not found"]'; END IF;
  SELECT * INTO c FROM wealth_compliance_checks WHERE workflow_id=_workflow_id;
  acc := EXISTS (SELECT 1 FROM wealth_recommendations WHERE workflow_id=_workflow_id AND status='accepted');
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
  IF _target_stage IN ('underwriting','submission') AND NOT EXISTS (SELECT 1 FROM wealth_applications WHERE workflow_id=_workflow_id AND status IN ('ready','underwriting','submitted','issued')) THEN
    b := b || '["Application not ready"]'; END IF;
  IF _target_stage='issued' AND NOT EXISTS (SELECT 1 FROM wealth_applications WHERE workflow_id=_workflow_id AND status IN ('submitted','issued')) THEN
    b := b || '["Application not submitted"]'; END IF;
  IF _target_stage IN ('follow_up','annual_review') AND NOT EXISTS (SELECT 1 FROM wealth_applications WHERE workflow_id=_workflow_id AND status='issued') THEN
    b := b || '["Provider has not confirmed issue"]'; END IF;
  RETURN b;
END $$;

-- Derive stage from records (returns stage + blockers)
CREATE OR REPLACE FUNCTION public.wealth_derive_stage(_workflow_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE w record; r record; a record; s text; bl jsonb := '[]';
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  IF w.status IN ('closed_declined','completed') THEN RETURN jsonb_build_object('stage',w.current_stage,'blockers','[]'::jsonb); END IF;
  SELECT * INTO a FROM wealth_applications WHERE workflow_id=_workflow_id ORDER BY created_at DESC LIMIT 1;
  SELECT * INTO r FROM wealth_recommendations WHERE workflow_id=_workflow_id AND status<>'superseded' ORDER BY version DESC LIMIT 1;
  IF a.id IS NOT NULL AND a.status='issued' THEN
    s := CASE WHEN w.current_stage IN ('follow_up','annual_review') THEN w.current_stage ELSE 'issued' END;
  ELSIF a.id IS NOT NULL AND a.status='submitted' THEN s := 'submission';
  ELSIF a.id IS NOT NULL AND a.status='underwriting' THEN s := 'underwriting';
  ELSIF r.id IS NOT NULL AND r.status='accepted' THEN
    IF NOT (wealth_has_doc(_workflow_id,'roa_signed') AND wealth_has_doc(_workflow_id,'proof_of_residence') AND wealth_has_doc(_workflow_id,'id_document')) AND a.id IS NULL THEN
      s := 'documentation';
      bl := wealth_blockers(_workflow_id,'application') - 'KYC/FICA not completed' - 'Bank validation not completed' - 'Required declarations not completed';
    ELSE
      bl := wealth_blockers(_workflow_id,'application');
      IF a.id IS NOT NULL THEN s := 'application';
      ELSIF bl @> '["KYC/FICA not completed"]' OR bl @> '["Bank validation not completed"]' OR bl @> '["Required declarations not completed"]' THEN s := 'compliance';
      ELSE s := 'application'; END IF;
    END IF;
  ELSIF r.id IS NOT NULL AND r.status='presented' THEN s := 'client_decision';
  ELSIF r.id IS NOT NULL AND r.status='draft' THEN s := 'recommendation';
  ELSE
    -- early stages are advanced by explicit transitions
    s := w.current_stage;
  END IF;
  RETURN jsonb_build_object('stage',s,'blockers',bl);
END $$;

CREATE OR REPLACE FUNCTION public.wealth_apply_stage(_workflow_id uuid, _stage text, _blockers jsonb, _actor text, _reason text, _rtype text, _rid uuid, _decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id FOR UPDATE;
  IF w.current_stage IS DISTINCT FROM _stage THEN
    INSERT INTO wealth_workflow_transitions(workflow_id,from_stage,to_stage,actor_type,actor_user_id,reason,related_record_type,related_record_id,decision)
    VALUES (_workflow_id,w.current_stage,_stage,_actor,CASE WHEN _actor='user' THEN auth.uid() END,_reason,_rtype,_rid,_decision);
  END IF;
  UPDATE wealth_workflows SET current_stage=_stage, blockers=COALESCE(_blockers,'[]'),
    status=CASE WHEN status IN ('closed_declined','completed') THEN status
                WHEN jsonb_array_length(COALESCE(_blockers,'[]'))>0 THEN 'blocked' ELSE 'active' END
  WHERE id=_workflow_id;
END $$;

CREATE OR REPLACE FUNCTION public.wealth_refresh(_workflow_id uuid, _rtype text DEFAULT NULL, _rid uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d jsonb;
BEGIN
  d := wealth_derive_stage(_workflow_id);
  PERFORM wealth_apply_stage(_workflow_id, d->>'stage', d->'blockers', 'system', 'Derived from records', _rtype, _rid, NULL);
  RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.wealth_assert_access(_workflow_id uuid) RETURNS record LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  IF w IS NULL OR NOT can_view_patient_record(w.patient_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN w;
END $$;

CREATE OR REPLACE FUNCTION public.wealth_transition(_workflow_id uuid, _to_stage text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record; def record; bl jsonb;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  IF w IS NULL OR NOT can_view_patient_record(w.patient_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF w.status IN ('closed_declined','completed') THEN RAISE EXCEPTION 'Workflow is closed'; END IF;
  SELECT * INTO def FROM wealth_workflow_stage_defs WHERE stage=w.current_stage;
  IF NOT (_to_stage = ANY(def.next_stages)) THEN
    RAISE EXCEPTION 'Invalid transition % -> %', w.current_stage, _to_stage; END IF;
  IF _to_stage IN ('closed_declined','recommendation') AND w.current_stage='client_decision' THEN
    RAISE EXCEPTION 'Use wealth_record_decision for client decisions'; END IF;
  IF _to_stage='consultation' THEN RAISE EXCEPTION 'Use wealth_start_annual_review to restart the cycle'; END IF;
  bl := wealth_blockers(_workflow_id,_to_stage);
  IF jsonb_array_length(bl)>0 THEN
    UPDATE wealth_workflows SET blockers=bl, status='blocked' WHERE id=_workflow_id;
    RETURN jsonb_build_object('ok',false,'stage',w.current_stage,'blockers',bl);
  END IF;
  PERFORM wealth_apply_stage(_workflow_id,_to_stage,'[]','user',_reason,NULL,NULL,NULL);
  RETURN jsonb_build_object('ok',true,'stage',_to_stage,'blockers','[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.wealth_record_decision(_recommendation_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; w record; new_id uuid;
BEGIN
  SELECT * INTO r FROM wealth_recommendations WHERE id=_recommendation_id FOR UPDATE;
  SELECT * INTO w FROM wealth_workflows WHERE id=r.workflow_id;
  IF w IS NULL OR NOT can_view_patient_record(w.patient_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF r.status<>'presented' THEN RAISE EXCEPTION 'Recommendation must be presented before a decision'; END IF;
  IF _decision NOT IN ('accepted','declined','changes_requested') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  UPDATE wealth_recommendations SET status=_decision, decided_at=now(), decision_reason=_reason WHERE id=r.id;
  IF _decision='accepted' THEN
    INSERT INTO wealth_compliance_checks(workflow_id) VALUES (w.id) ON CONFLICT DO NOTHING;
    PERFORM wealth_apply_stage(w.id,'documentation','[]','user',_reason,'recommendation',r.id,'accepted');
    PERFORM wealth_refresh(w.id,'recommendation',r.id);
  ELSIF _decision='declined' THEN
    PERFORM wealth_apply_stage(w.id,'closed_declined','[]','user',_reason,'recommendation',r.id,'declined');
    UPDATE wealth_workflows SET status='closed_declined' WHERE id=w.id;
  ELSE
    INSERT INTO wealth_recommendations(workflow_id,version,title,summary,status,supersedes_id)
    VALUES (w.id, r.version+1, r.title, r.summary, 'draft', r.id) RETURNING id INTO new_id;
    PERFORM wealth_apply_stage(w.id,'recommendation','[]','user',COALESCE(_reason,'Changes requested'),'recommendation',r.id,'changes_requested');
  END IF;
  RETURN jsonb_build_object('ok',true,'new_recommendation_id',new_id);
END $$;

CREATE OR REPLACE FUNCTION public.wealth_present_recommendation(_recommendation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; w record;
BEGIN
  SELECT * INTO r FROM wealth_recommendations WHERE id=_recommendation_id;
  SELECT * INTO w FROM wealth_workflows WHERE id=r.workflow_id;
  IF w IS NULL OR NOT can_view_patient_record(w.patient_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF r.status<>'draft' THEN RAISE EXCEPTION 'Only draft recommendations can be presented'; END IF;
  IF r.roa_document_id IS NULL THEN RAISE EXCEPTION 'Attach the ROA before presenting'; END IF;
  -- mark older open versions superseded (kept for history)
  UPDATE wealth_recommendations SET status='superseded' WHERE workflow_id=r.workflow_id AND id<>r.id AND status IN ('draft','changes_requested');
  UPDATE wealth_recommendations SET status='presented', presented_at=now() WHERE id=r.id;
  PERFORM wealth_apply_stage(w.id,'client_presentation','[]','user','Presented to client','recommendation',r.id,NULL);
  PERFORM wealth_apply_stage(w.id,'client_decision','[]','system','Awaiting client decision','recommendation',r.id,'pending');
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.wealth_start_annual_review(_workflow_id uuid, _appointment_id uuid DEFAULT NULL, _session_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record; new_id uuid;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  IF w IS NULL OR NOT can_view_patient_record(w.patient_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF w.current_stage NOT IN ('follow_up','annual_review') THEN RAISE EXCEPTION 'Annual review can only start from Follow-up or Annual Review'; END IF;
  IF w.current_stage='follow_up' THEN PERFORM wealth_apply_stage(w.id,'annual_review','[]','user','Annual review started',NULL,NULL,NULL); END IF;
  UPDATE wealth_workflows SET status='completed' WHERE id=w.id;
  INSERT INTO wealth_workflows(patient_id,practice_id,owner_user_id,current_stage,cycle_number,previous_workflow_id,annual_review_appointment_id,consultation_session_id)
  VALUES (w.patient_id,w.practice_id,w.owner_user_id,'consultation',w.cycle_number+1,w.id,_appointment_id,_session_id) RETURNING id INTO new_id;
  INSERT INTO wealth_workflow_transitions(workflow_id,from_stage,to_stage,actor_type,actor_user_id,reason,related_record_type,related_record_id)
  VALUES (new_id,'annual_review','consultation','user',auth.uid(),'Annual review cycle '||(w.cycle_number+1),'workflow',w.id);
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.wealth_start_workflow(_patient_id uuid, _session_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT can_view_patient_record(_patient_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT id INTO new_id FROM wealth_workflows WHERE patient_id=_patient_id AND status IN ('active','blocked');
  IF new_id IS NOT NULL THEN RETURN new_id; END IF;
  INSERT INTO wealth_workflows(patient_id,consultation_session_id) VALUES (_patient_id,_session_id) RETURNING id INTO new_id;
  INSERT INTO wealth_workflow_transitions(workflow_id,from_stage,to_stage,actor_type,actor_user_id,reason,related_record_type,related_record_id)
  VALUES (new_id,NULL,'consultation','user',auth.uid(),'Workflow started','session',_session_id);
  RETURN new_id;
END $$;

-- Triggers: re-derive on record changes; issued -> review date + action
CREATE OR REPLACE FUNCTION public.wealth_on_record_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE wf uuid := NEW.workflow_id; w record;
BEGIN
  IF TG_TABLE_NAME='wealth_applications' AND NEW.status='issued' AND (TG_OP='INSERT' OR OLD.status<>'issued') THEN
    NEW.issued_at := COALESCE(NEW.issued_at, now());
    NEW.review_date := COALESCE(NEW.review_date, (NEW.issued_at + interval '12 months')::date);
  END IF;
  IF TG_TABLE_NAME='wealth_applications' AND NEW.status='submitted' THEN NEW.submitted_at := COALESCE(NEW.submitted_at, now()); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER wealth_app_before BEFORE INSERT OR UPDATE ON public.wealth_applications FOR EACH ROW EXECUTE FUNCTION public.wealth_on_record_change();

CREATE OR REPLACE FUNCTION public.wealth_after_record_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record;
BEGIN
  PERFORM wealth_refresh(NEW.workflow_id, TG_TABLE_NAME, NEW.id);
  IF TG_TABLE_NAME='wealth_applications' AND NEW.status='issued' AND (TG_OP='INSERT' OR OLD.status<>'issued') THEN
    SELECT * INTO w FROM wealth_workflows WHERE id=NEW.workflow_id;
    UPDATE wealth_workflows SET next_review_date=NEW.review_date WHERE id=w.id;
    INSERT INTO todos(user_id,patient_id,title,priority,status,due_date,task_type,workflow_id,workflow_stage,owner_role,application_id,product,created_by)
    VALUES (w.owner_user_id,w.patient_id,'Annual review: contact client','medium','pending',NEW.review_date::timestamptz - interval '30 days','annual_review',w.id,'annual_review','wealth_manager',NEW.id,NEW.product,w.owner_user_id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER wealth_rec_after AFTER INSERT OR UPDATE OF status ON public.wealth_recommendations FOR EACH ROW WHEN (pg_trigger_depth() < 2) EXECUTE FUNCTION public.wealth_after_record_change();
CREATE TRIGGER wealth_app_after AFTER INSERT OR UPDATE ON public.wealth_applications FOR EACH ROW EXECUTE FUNCTION public.wealth_after_record_change();
CREATE TRIGGER wealth_cc_after AFTER INSERT OR UPDATE ON public.wealth_compliance_checks FOR EACH ROW EXECUTE FUNCTION public.wealth_after_record_change();

CREATE OR REPLACE FUNCTION public.wealth_after_document_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE wf uuid;
BEGIN
  IF NEW.document_kind IS NULL OR NEW.patient_id IS NULL THEN RETURN NULL; END IF;
  FOR wf IN SELECT id FROM wealth_workflows WHERE patient_id=NEW.patient_id AND status IN ('active','blocked') LOOP
    PERFORM wealth_refresh(wf,'document',NEW.id);
  END LOOP;
  RETURN NULL;
END $$;
CREATE TRIGGER wealth_doc_after AFTER INSERT OR UPDATE OF document_kind ON public.documents FOR EACH ROW EXECUTE FUNCTION public.wealth_after_document_change();

REVOKE EXECUTE ON FUNCTION public.wealth_apply_stage(uuid,text,jsonb,text,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wealth_refresh(uuid,text,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wealth_assert_access(uuid) FROM PUBLIC, anon, authenticated;
