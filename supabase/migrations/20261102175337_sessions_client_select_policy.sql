-- sessions only had policies for the Wealth Manager who created the row
-- (auth.uid() = user_id). A client viewing their own My Profile page has no
-- policy granting them SELECT at all, so useSessions() always failed with
-- "Failed to load sessions". Add the missing client-facing policy, reusing
-- can_view_patient_record so access stays consistent with every other
-- client-record table (also covers assistants/delegated broker access).
CREATE POLICY "Clients can view their own sessions" ON public.sessions
  FOR SELECT TO authenticated
  USING (public.can_view_patient_record(patient_id));
