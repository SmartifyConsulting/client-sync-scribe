
CREATE TABLE public.auth_recovery_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip TEXT,
  identifier_hash TEXT,
  code_hash TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.auth_recovery_attempts TO service_role;
ALTER TABLE public.auth_recovery_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX auth_recovery_attempts_ip_idx ON public.auth_recovery_attempts (ip, created_at DESC);
CREATE INDEX auth_recovery_attempts_identifier_idx ON public.auth_recovery_attempts (identifier_hash, created_at DESC);

CREATE TABLE public.auth_recovery_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID,
  ip TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.auth_recovery_audit TO service_role;
ALTER TABLE public.auth_recovery_audit ENABLE ROW LEVEL SECURITY;
CREATE INDEX auth_recovery_audit_user_idx ON public.auth_recovery_audit (user_id, created_at DESC);
