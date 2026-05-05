ALTER TABLE public.holarchelp_incidents
ADD COLUMN IF NOT EXISTS voice_note_audio_url text,
ADD COLUMN IF NOT EXISTS voice_note_transcript text;