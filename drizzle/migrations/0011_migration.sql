CREATE TABLE public.wealth_quote_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  product_type text NOT NULL,
  variations jsonb NOT NULL DEFAULT '[]'::jsonb,
  insurers text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_quote_specs TO authenticated;
GRANT ALL ON public.wealth_quote_specs TO service_role;
ALTER TABLE public.wealth_quote_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read quote specs" ON public.wealth_quote_specs FOR SELECT USING (wealth_is_workflow_party(workflow_id, auth.uid()));
CREATE POLICY "WM adds quote specs" ON public.wealth_quote_specs FOR INSERT WITH CHECK (wealth_is_workflow_owner(workflow_id, auth.uid()));
CREATE POLICY "WM edits quote specs" ON public.wealth_quote_specs FOR UPDATE USING (wealth_is_workflow_owner(workflow_id, auth.uid()));
CREATE POLICY "WM removes quote specs" ON public.wealth_quote_specs FOR DELETE USING (wealth_is_workflow_owner(workflow_id, auth.uid()));
CREATE INDEX ON public.wealth_quote_specs(workflow_id);