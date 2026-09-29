CREATE POLICY "Insurer staff can view submitted applications"
ON public.wealth_applications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'insurer_staff') AND status IN ('underwriting','submitted','issued'));