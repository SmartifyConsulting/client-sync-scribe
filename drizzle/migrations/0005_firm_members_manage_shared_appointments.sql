CREATE POLICY "Firm members can update shared appointments" ON public.appointments FOR UPDATE TO authenticated
USING (practice_id IS NOT NULL AND public.is_practice_member(practice_id, auth.uid()))
WITH CHECK (practice_id IS NOT NULL AND public.is_practice_member(practice_id, auth.uid()));
CREATE POLICY "Firm members can delete shared appointments" ON public.appointments FOR DELETE TO authenticated
USING (practice_id IS NOT NULL AND public.is_practice_member(practice_id, auth.uid()));