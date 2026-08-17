ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check CHECK (status = ANY (ARRAY['in_progress'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]));
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS paused_at timestamp with time zone;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS elapsed_seconds integer;
CREATE INDEX IF NOT EXISTS idx_sessions_paused ON public.sessions (user_id, patient_id) WHERE status = 'paused';