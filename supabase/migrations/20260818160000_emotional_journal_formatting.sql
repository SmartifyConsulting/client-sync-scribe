ALTER TABLE public.patient_emotional_journal
  ADD COLUMN IF NOT EXISTS font_size smallint NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS is_bold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_italic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_underline boolean NOT NULL DEFAULT false;
