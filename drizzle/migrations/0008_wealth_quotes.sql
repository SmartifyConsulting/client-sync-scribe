CREATE TABLE public.wealth_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.wealth_workflows(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('manual','assisted')),
  insurer text NOT NULL,
  product text NOT NULL,
  monthly_premium numeric NOT NULL CHECK (monthly_premium >= 0),
  cover_amount numeric,
  rank integer,
  selected boolean NOT NULL DEFAULT false,
  commentary text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wealth_quotes_wf_idx ON public.wealth_quotes(workflow_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_quotes TO authenticated;
GRANT ALL ON public.wealth_quotes TO service_role;
ALTER TABLE public.wealth_quotes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.wealth_is_workflow_owner(_wf uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM wealth_workflows w JOIN patients p ON p.id = w.patient_id
    WHERE w.id = _wf AND (w.owner_user_id = _uid OR p.user_id = _uid));
$$;
CREATE OR REPLACE FUNCTION public.wealth_is_workflow_party(_wf uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM wealth_workflows w JOIN patients p ON p.id = w.patient_id
    WHERE w.id = _wf AND (w.owner_user_id = _uid OR p.user_id = _uid OR p.patient_user_id = _uid));
$$;

CREATE POLICY "Parties read quotes" ON public.wealth_quotes FOR SELECT TO authenticated
  USING (public.wealth_is_workflow_party(workflow_id, auth.uid()));
CREATE POLICY "Wealth Manager adds quotes" ON public.wealth_quotes FOR INSERT TO authenticated
  WITH CHECK (public.wealth_is_workflow_owner(workflow_id, auth.uid()));
CREATE POLICY "Wealth Manager edits quotes" ON public.wealth_quotes FOR UPDATE TO authenticated
  USING (public.wealth_is_workflow_owner(workflow_id, auth.uid()));
CREATE POLICY "Wealth Manager removes quotes" ON public.wealth_quotes FOR DELETE TO authenticated
  USING (public.wealth_is_workflow_owner(workflow_id, auth.uid()));

CREATE TRIGGER wealth_quotes_touch BEFORE UPDATE ON public.wealth_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.wealth_quotes_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; pid uuid;
BEGIN
  r := COALESCE(NEW, OLD);
  SELECT patient_id INTO pid FROM wealth_workflows WHERE id = r.workflow_id;
  INSERT INTO wealth_audit_log(patient_id, actor_user_id, action, details, record_type, record_id)
  VALUES (pid, auth.uid(), 'quote_' || lower(TG_OP), jsonb_build_object('insurer', r.insurer, 'premium', r.monthly_premium, 'method', r.method, 'selected', r.selected), 'wealth_quotes', r.id);
  RETURN r;
END $$;
CREATE TRIGGER wealth_quotes_audit_trg AFTER INSERT OR UPDATE OR DELETE ON public.wealth_quotes
  FOR EACH ROW EXECUTE FUNCTION public.wealth_quotes_audit();