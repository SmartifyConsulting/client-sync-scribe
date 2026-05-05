ALTER TABLE public.holarchelp_incidents
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS manually_logged boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Users insert own incidents" ON public.holarchelp_incidents;
CREATE POLICY "Users insert own incidents"
ON public.holarchelp_incidents
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());