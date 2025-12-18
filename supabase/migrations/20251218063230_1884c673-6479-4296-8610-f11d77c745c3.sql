-- Allow authenticated users to search for other profiles (limited columns)
-- This is needed for the user search/invite functionality
CREATE POLICY "Authenticated users can search profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');