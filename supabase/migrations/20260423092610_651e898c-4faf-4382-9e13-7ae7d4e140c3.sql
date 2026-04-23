ALTER TABLE public.medication_adherence
ADD COLUMN IF NOT EXISTS tablet_count_expected integer,
ADD COLUMN IF NOT EXISTS tablet_count_detected integer;