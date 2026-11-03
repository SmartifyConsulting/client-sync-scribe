-- profiles had policies for a client viewing their Wealth Manager's profile
-- and for a doctor viewing a connected patient's profile via
-- broker_client_access, but nothing letting a Wealth Manager view their own
-- client's profile — so a client's uploaded photo (and anything else on
-- their profiles row) was invisible from the Wealth Manager's side.
CREATE POLICY "Brokers can view their clients' profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.patient_user_id = profiles.id
        AND c.user_id = auth.uid()
    )
  );
