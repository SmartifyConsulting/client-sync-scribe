ALTER TABLE public.hospital_staff_shifts
  ADD COLUMN IF NOT EXISTS rest_ack_by uuid,
  ADD COLUMN IF NOT EXISTS rest_ack_at timestamptz,
  ADD COLUMN IF NOT EXISTS rest_ack_note text,
  ADD COLUMN IF NOT EXISTS notes text;