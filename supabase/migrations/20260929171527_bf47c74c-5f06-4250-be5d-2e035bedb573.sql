ALTER TABLE public.wealth_recommendations ADD COLUMN IF NOT EXISTS quote_expires_at date;

CREATE OR REPLACE FUNCTION public.wealth_notify_transition()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    IF NEW.to_stage='application' AND w.practice_id IS NOT NULL THEN
      INSERT INTO notifications(user_id,type,title,description,reference_id)
      SELECT DISTINCT pm.user_id,'wealth_workflow','Application ready',cname||': application is ready for submission.',w.id
      FROM practice_members pm WHERE pm.practice_id=w.practice_id AND pm.user_id IS NOT NULL AND pm.user_id IS DISTINCT FROM w.owner_user_id;
    END IF;
  END IF;
  RETURN NULL;
END $function$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;