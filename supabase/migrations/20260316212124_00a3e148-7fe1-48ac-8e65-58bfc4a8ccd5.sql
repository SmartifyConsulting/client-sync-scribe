CREATE POLICY "Anyone authenticated can view CPD certificates"
ON public.cpd_certificates FOR SELECT TO authenticated
USING (true);