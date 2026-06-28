DROP POLICY IF EXISTS "Owner or admin can read insurer" ON public.holarchelp_insurance_providers;
CREATE POLICY "Owner or admin can read insurer" ON public.holarchelp_insurance_providers
FOR SELECT USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));