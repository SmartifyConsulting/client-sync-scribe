
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['wealth_workflows','wealth_workflow_transitions','wealth_recommendations','wealth_applications','wealth_compliance_checks','todos'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP; END $$;

CREATE OR REPLACE FUNCTION public.wealth_notify_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record; p record; cname text;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=NEW.workflow_id;
  SELECT id, name, patient_user_id INTO p FROM patients WHERE id=w.patient_id;
  cname := COALESCE(p.name,'Client');
  IF NEW.to_stage='client_decision' AND p.patient_user_id IS NOT NULL THEN
    INSERT INTO notifications(user_id,type,title,description,reference_id)
    VALUES (p.patient_user_id,'wealth_workflow','Recommendation ready','Your Wealth Manager has prepared a recommendation for you.',w.id);
  ELSIF NEW.decision='accepted' THEN
    INSERT INTO notifications(user_id,type,title,description,reference_id)
    VALUES (w.owner_user_id,'wealth_workflow','Recommendation accepted',cname||' has accepted the recommendation.',w.id);
  ELSIF NEW.decision='declined' THEN
    INSERT INTO notifications(user_id,type,title,description,reference_id)
    VALUES (w.owner_user_id,'wealth_workflow','Recommendation declined',cname||' has declined the recommendation.',w.id);
  ELSIF NEW.decision='changes_requested' THEN
    INSERT INTO notifications(user_id,type,title,description,reference_id)
    VALUES (w.owner_user_id,'wealth_workflow','Changes requested',cname||' has requested changes to the recommendation.',w.id);
  ELSIF NEW.to_stage IN ('application','submission','issued') THEN
    INSERT INTO notifications(user_id,type,title,description,reference_id)
    VALUES (w.owner_user_id,'wealth_workflow',
      CASE NEW.to_stage WHEN 'application' THEN 'Application ready' WHEN 'submission' THEN 'Application submitted' ELSE 'Policy issued' END,
      cname||': '||CASE NEW.to_stage WHEN 'application' THEN 'application is ready for submission.' WHEN 'submission' THEN 'application has been submitted.' ELSE 'policy has been issued. Annual review scheduled.' END,
      w.id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER wealth_transition_notify AFTER INSERT ON public.wealth_workflow_transitions
  FOR EACH ROW EXECUTE FUNCTION public.wealth_notify_transition();

CREATE OR REPLACE FUNCTION public.wealth_notify_roa_signed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record; cname text;
BEGIN
  IF NEW.document_kind='roa_signed' AND (TG_OP='INSERT' OR OLD.document_kind IS DISTINCT FROM 'roa_signed') AND NEW.patient_id IS NOT NULL THEN
    SELECT name INTO cname FROM patients WHERE id=NEW.patient_id;
    FOR w IN SELECT * FROM wealth_workflows WHERE patient_id=NEW.patient_id AND status IN ('active','blocked') LOOP
      INSERT INTO notifications(user_id,type,title,description,reference_id)
      VALUES (w.owner_user_id,'wealth_workflow','ROA signed',COALESCE(cname,'Client')||' has signed the ROA.',w.id);
    END LOOP;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER wealth_doc_roa_notify AFTER INSERT OR UPDATE OF document_kind ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.wealth_notify_roa_signed();

CREATE OR REPLACE FUNCTION public.wealth_send_reminder(_todo_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t record; p record;
BEGIN
  SELECT * INTO t FROM todos WHERE id=_todo_id;
  IF t IS NULL OR t.patient_id IS NULL OR NOT can_view_patient_record(t.patient_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT patient_user_id INTO p FROM patients WHERE id=t.patient_id;
  IF p.patient_user_id IS NULL THEN RETURN false; END IF;
  INSERT INTO notifications(user_id,type,title,description,reference_id)
  VALUES (p.patient_user_id,'wealth_reminder','Reminder: '||t.title,'Your Wealth Manager has sent you a reminder to complete this action.',t.id);
  RETURN true;
END $$;

REVOKE EXECUTE ON FUNCTION public.wealth_notify_transition(), public.wealth_notify_roa_signed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wealth_send_reminder(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wealth_send_reminder(uuid) TO authenticated;
