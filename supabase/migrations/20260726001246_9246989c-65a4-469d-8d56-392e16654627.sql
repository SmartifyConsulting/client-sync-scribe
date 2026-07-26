ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS ai_diagnosis text,
  ADD COLUMN IF NOT EXISTS ai_findings_note text;