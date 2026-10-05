-- Step 3 (schedules/policies/claims history) and Step 4 (quotes) both send a
-- request to a chosen set of insurers using a chosen template, then file
-- whatever comes back. This tracks each request so an inbound email can be
-- matched to the right client, workflow and request kind.

CREATE TABLE IF NOT EXISTS public.wealth_request_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('schedules_claims', 'quotes')),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wealth_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.wealth_workflows(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  broker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('schedules_claims', 'quotes')),
  template_id uuid REFERENCES public.wealth_request_templates(id) ON DELETE SET NULL,
  insurer_names text[] NOT NULL DEFAULT '{}',
  attached_document_ids uuid[] NOT NULL DEFAULT '{}',
  reply_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'documents_received')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wealth_document_requests_workflow_idx ON public.wealth_document_requests(workflow_id);

ALTER TABLE public.wealth_request_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broker manages their own templates"
  ON public.wealth_request_templates FOR ALL
  USING (broker_user_id = auth.uid())
  WITH CHECK (broker_user_id = auth.uid());

CREATE POLICY "Broker manages their own document requests"
  ON public.wealth_document_requests FOR ALL
  USING (broker_user_id = auth.uid())
  WITH CHECK (broker_user_id = auth.uid());

-- Links a filed document back to the request that produced it, and which
-- cover type it was classified under for quote requests.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.wealth_document_requests(id) ON DELETE SET NULL;
