GRANT SELECT ON public.holarchelp_hospitals_public TO authenticated, anon;

CREATE POLICY "Authenticated users can view approved hospitals"
  ON public.holarchelp_hospitals
  FOR SELECT
  TO authenticated
  USING (status = 'approved');