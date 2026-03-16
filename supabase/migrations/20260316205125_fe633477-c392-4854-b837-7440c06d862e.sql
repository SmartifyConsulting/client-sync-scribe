CREATE POLICY "Authenticated users can search profiles by name"
ON public.profiles FOR SELECT
TO authenticated
USING (true);