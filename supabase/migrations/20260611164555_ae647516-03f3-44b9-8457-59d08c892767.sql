CREATE TABLE public.mfa_backup_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);

CREATE INDEX mfa_backup_codes_user_idx ON public.mfa_backup_codes (user_id) WHERE used_at IS NULL;

GRANT ALL ON public.mfa_backup_codes TO service_role;

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: only service_role (via edge functions) may touch this table.
CREATE POLICY "service role only" ON public.mfa_backup_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);