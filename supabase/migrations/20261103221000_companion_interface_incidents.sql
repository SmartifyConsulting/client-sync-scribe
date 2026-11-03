-- Shared structural incidents; no client values, passwords, URLs or screenshots.
CREATE TABLE IF NOT EXISTS public.companion_interface_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id text NOT NULL REFERENCES public.app_integrations_catalog(id),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  companion_version text NOT NULL,
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence)='object' AND octet_length(evidence::text)<=100000),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','claimed','patch_ready','needs_review','released')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  repair_pr_url text,
  UNIQUE (integration_id,fingerprint)
);
CREATE TABLE IF NOT EXISTS public.companion_interface_reporters (
  incident_id uuid NOT NULL REFERENCES public.companion_interface_incidents(id) ON DELETE CASCADE,
  broker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(incident_id,broker_user_id)
);
ALTER TABLE public.companion_interface_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_interface_reporters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.companion_interface_incidents,public.companion_interface_reporters FROM anon,authenticated;
GRANT SELECT ON public.companion_interface_incidents,public.companion_interface_reporters TO authenticated;
DROP POLICY IF EXISTS "Read own interface reports" ON public.companion_interface_reporters;
CREATE POLICY "Read own interface reports" ON public.companion_interface_reporters FOR SELECT TO authenticated USING(broker_user_id=auth.uid());
DROP POLICY IF EXISTS "Read reported interface incidents" ON public.companion_interface_incidents;
CREATE POLICY "Read reported interface incidents" ON public.companion_interface_incidents FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.companion_interface_reporters r WHERE r.incident_id=id AND r.broker_user_id=auth.uid()));
CREATE INDEX IF NOT EXISTS companion_incident_queue ON public.companion_interface_incidents(first_seen_at) WHERE status='queued';
GRANT ALL ON public.companion_interface_incidents,public.companion_interface_reporters TO service_role;
