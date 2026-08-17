-- Tracks mood before/after an Ask Holarc exploration plus direct feedback,
-- so efficacy can be measured (mood_end - mood_start) and fed into Biolog.
ALTER TABLE public.ask_maeve_sessions
  ADD COLUMN IF NOT EXISTS mood_start smallint,
  ADD COLUMN IF NOT EXISTS mood_end smallint,
  ADD COLUMN IF NOT EXISTS feedback_rating smallint,
  ADD COLUMN IF NOT EXISTS feedback_text text;
