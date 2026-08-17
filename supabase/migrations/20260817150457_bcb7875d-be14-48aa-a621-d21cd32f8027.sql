ALTER TABLE public.profile_view_log
  ADD COLUMN IF NOT EXISTS screen text,
  ADD COLUMN IF NOT EXISTS owner_id uuid;

CREATE INDEX IF NOT EXISTS profile_view_log_owner_viewed_idx
  ON public.profile_view_log (owner_id, viewed_at DESC);

GRANT SELECT, INSERT ON public.profile_view_log TO authenticated;
GRANT ALL ON public.profile_view_log TO service_role;

DROP POLICY IF EXISTS "Owners can view views of their profile" ON public.profile_view_log;
CREATE POLICY "Owners can view views of their profile"
  ON public.profile_view_log
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());