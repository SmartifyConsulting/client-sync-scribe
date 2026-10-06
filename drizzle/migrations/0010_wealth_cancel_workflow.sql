ALTER TABLE public.wealth_workflows ADD COLUMN IF NOT EXISTS cancel_reason text, ADD COLUMN IF NOT EXISTS cancelled_by uuid, ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.wealth_workflows DROP CONSTRAINT IF EXISTS wealth_workflows_status_check;
ALTER TABLE public.wealth_workflows ADD CONSTRAINT wealth_workflows_status_check CHECK (status IN ('active','blocked','closed_declined','completed','cancelled'));
CREATE OR REPLACE FUNCTION public.wealth_cancel_workflow(_workflow_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w wealth_workflows;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN RAISE EXCEPTION 'Please give a reason for cancelling.'; END IF;
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id FOR UPDATE;
  IF w IS NULL OR NOT public.can_view_patient_record(w.patient_id) THEN RAISE EXCEPTION 'You do not have access to this workspace.'; END IF;
  IF w.status NOT IN ('active','blocked') THEN RAISE EXCEPTION 'This workspace is already closed.'; END IF;
  UPDATE wealth_workflows SET status='cancelled', cancel_reason=trim(_reason), cancelled_by=auth.uid(), cancelled_at=now() WHERE id=_workflow_id;
END $$;
REVOKE ALL ON FUNCTION public.wealth_cancel_workflow(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wealth_cancel_workflow(uuid,text) TO authenticated;