ALTER TABLE public.holarchelp_incidents
  ADD COLUMN IF NOT EXISTS triggered_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS triggered_by_role text;

CREATE INDEX IF NOT EXISTS idx_holarchelp_incidents_triggered_by ON public.holarchelp_incidents(triggered_by_user_id);