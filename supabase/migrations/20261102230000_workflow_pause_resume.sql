-- Pause is independent of stage/status so resuming preserves the current step.
ALTER TABLE public.wealth_workflows
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_by uuid,
  ADD COLUMN IF NOT EXISTS total_paused_seconds bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.wealth_set_workflow_paused(_workflow_id uuid, _paused boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE w public.wealth_workflows; started timestamptz; ended timestamptz; seconds bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  IF _paused IS NULL THEN RAISE EXCEPTION 'Choose pause or resume.'; END IF;
  SELECT * INTO w FROM public.wealth_workflows WHERE id=_workflow_id FOR UPDATE;
  IF w IS NULL OR NOT public.can_view_patient_record(w.patient_id) THEN
    RAISE EXCEPTION 'You do not have access to this workspace.';
  END IF;
  IF w.status NOT IN ('active','blocked') THEN RAISE EXCEPTION 'This workspace is already closed.'; END IF;
  -- Repeated clicks/retries cannot create duplicate pause/resume entries.
  IF _paused = (w.paused_at IS NOT NULL) THEN
    RETURN jsonb_build_object('paused_at',w.paused_at,'changed',false);
  END IF;
  IF _paused THEN
    started := clock_timestamp();
    UPDATE public.wealth_workflows SET paused_at=started, paused_by=auth.uid() WHERE id=w.id;
    INSERT INTO public.wealth_audit_log(patient_id,actor_user_id,action,details,record_type,record_id,created_at)
    VALUES(w.patient_id,auth.uid(),'Workflow paused',
      'Pause started ' || to_char(started AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS') || ' UTC',
      'workflow',w.id::text,started);
  ELSE
    started := w.paused_at; ended := clock_timestamp();
    seconds := greatest(0,floor(extract(epoch FROM ended-started)))::bigint;
    UPDATE public.wealth_workflows SET paused_at=NULL,paused_by=NULL,
      total_paused_seconds=total_paused_seconds+seconds WHERE id=w.id;
    INSERT INTO public.wealth_audit_log(patient_id,actor_user_id,action,details,record_type,record_id,created_at)
    VALUES(w.patient_id,auth.uid(),'Workflow resumed',
      'Paused from ' || to_char(started AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS') || ' UTC to ' ||
      to_char(ended AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS') || ' UTC; duration ' ||
      (seconds/86400)::text || 'd ' || ((seconds%86400)/3600)::text || 'h ' ||
      ((seconds%3600)/60)::text || 'm ' || (seconds%60)::text || 's',
      'workflow',w.id::text,ended);
  END IF;
  RETURN jsonb_build_object('paused_at',CASE WHEN _paused THEN started ELSE NULL END,'changed',true);
END;
$function$;
REVOKE ALL ON FUNCTION public.wealth_set_workflow_paused(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wealth_set_workflow_paused(uuid,boolean) TO authenticated;

-- Existing automatic advancement quietly waits while paused. Preserve all of
-- the live function's other rules and grants rather than replacing its body.
DO $repair$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.wealth_apply_stage(uuid,text,jsonb,text,text,text,uuid,text)'::regprocedure)
  INTO definition;
  IF position('wealth_pause_gate' IN definition)=0 THEN
    definition := regexp_replace(definition,'\mBEGIN\M',
      E'BEGIN\n  -- wealth_pause_gate: serialize with Pause/Resume and defer advancement.\n  PERFORM 1 FROM public.wealth_workflows WHERE id=_workflow_id FOR UPDATE;\n  IF EXISTS(SELECT 1 FROM public.wealth_workflows WHERE id=_workflow_id AND paused_at IS NOT NULL) THEN RETURN; END IF;','i');
    EXECUTE definition;
  END IF;
END;
$repair$;

CREATE OR REPLACE FUNCTION public.wealth_guard_paused_workflow()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $function$
BEGIN
  IF OLD.paused_at IS NOT NULL AND NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
    RAISE EXCEPTION 'Resume this workspace before moving to another step.';
  END IF;
  IF current_user IN ('authenticated','anon') AND
    (NEW.paused_at IS DISTINCT FROM OLD.paused_at OR NEW.paused_by IS DISTINCT FROM OLD.paused_by
      OR NEW.total_paused_seconds IS DISTINCT FROM OLD.total_paused_seconds) THEN
    RAISE EXCEPTION 'Use the Pause/Resume control to change pause state.';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS wealth_guard_paused_workflow ON public.wealth_workflows;
CREATE TRIGGER wealth_guard_paused_workflow BEFORE UPDATE ON public.wealth_workflows
FOR EACH ROW EXECUTE FUNCTION public.wealth_guard_paused_workflow();
