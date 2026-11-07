CREATE OR REPLACE FUNCTION public.wealth_notify_roa_signed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE w record; cname text;
BEGIN
  IF NEW.document_kind='roa_signed' AND (TG_OP='INSERT' OR OLD.document_kind IS DISTINCT FROM 'roa_signed') AND NEW.patient_id IS NOT NULL THEN
    SELECT name INTO cname FROM public.clients WHERE id=NEW.patient_id;
    FOR w IN SELECT * FROM wealth_workflows WHERE patient_id=NEW.patient_id AND status IN ('active','blocked') LOOP
      INSERT INTO notifications(user_id,type,title,description,reference_id)
      VALUES (w.owner_user_id,'wealth_workflow','ROA signed',COALESCE(cname,'Client')||' has signed the ROA.',w.id);
    END LOOP;
  END IF;
  RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.wealth_send_reminder(_todo_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE t record; p record;
BEGIN
  SELECT * INTO t FROM todos WHERE id=_todo_id;
  IF t IS NULL OR t.patient_id IS NULL OR NOT can_view_patient_record(t.patient_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT patient_user_id INTO p FROM public.clients WHERE id=t.patient_id;
  IF p.patient_user_id IS NULL THEN RETURN false; END IF;
  INSERT INTO notifications(user_id,type,title,description,reference_id)
  VALUES (p.patient_user_id,'wealth_reminder','Reminder: '||t.title,'Your Wealth Manager has sent you a reminder to complete this action.',t.id);
  RETURN true;
END $function$;