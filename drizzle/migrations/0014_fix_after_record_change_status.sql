CREATE OR REPLACE FUNCTION public.wealth_after_record_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; n jsonb; o jsonb;
BEGIN
  PERFORM wealth_refresh(NEW.workflow_id, TG_TABLE_NAME, NEW.id);
  IF TG_TABLE_NAME = 'wealth_applications' THEN
    n := to_jsonb(NEW);
    o := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END;
    IF n->>'status' = 'issued' AND (TG_OP = 'INSERT' OR (o->>'status') IS DISTINCT FROM 'issued') THEN
      SELECT * INTO w FROM wealth_workflows WHERE id = NEW.workflow_id;
      UPDATE wealth_workflows SET next_review_date = (n->>'review_date')::date WHERE id = w.id;
      INSERT INTO todos(user_id,patient_id,title,priority,status,due_date,task_type,workflow_id,workflow_stage,owner_role,application_id,product,created_by)
      VALUES (w.owner_user_id,w.patient_id,'Annual review: contact client','medium','pending',(n->>'review_date')::date::timestamptz - interval '30 days','annual_review',w.id,'annual_review','wealth_manager',NEW.id,n->>'product',w.owner_user_id);
    END IF;
  END IF;
  RETURN NULL;
END $$;