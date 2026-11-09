ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS transcript_sealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS transcript_sealed_ip text,
  ADD COLUMN IF NOT EXISTS transcript_seal_hash text;

-- Once a transcript is sealed, its text and seal can never change.
CREATE OR REPLACE FUNCTION public.sessions_transcript_seal_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.transcript_seal_hash IS NOT NULL AND (
       NEW.transcript IS DISTINCT FROM OLD.transcript
    OR NEW.transcript_seal_hash IS DISTINCT FROM OLD.transcript_seal_hash
    OR NEW.transcript_sealed_at IS DISTINCT FROM OLD.transcript_sealed_at
    OR NEW.transcript_sealed_ip IS DISTINCT FROM OLD.transcript_sealed_ip) THEN
    RAISE EXCEPTION 'This transcript is sealed and cannot be changed';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sessions_transcript_seal_guard ON public.sessions;
CREATE TRIGGER sessions_transcript_seal_guard BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.sessions_transcript_seal_guard();
