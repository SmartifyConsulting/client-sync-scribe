DROP POLICY IF EXISTS "Users manage own incidents" ON public.holarchelp_incidents;
DROP POLICY IF EXISTS "Users insert own incidents" ON public.holarchelp_incidents;
DROP POLICY IF EXISTS "Users select own incidents" ON public.holarchelp_incidents;
DROP POLICY IF EXISTS "Users update own incidents" ON public.holarchelp_incidents;
DROP POLICY IF EXISTS "Users delete own incidents" ON public.holarchelp_incidents;

CREATE POLICY "Users select own incidents"
  ON public.holarchelp_incidents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own incidents"
  ON public.holarchelp_incidents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own incidents"
  ON public.holarchelp_incidents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own incidents"
  ON public.holarchelp_incidents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.holarchelp_user_enabled(auth.uid()));