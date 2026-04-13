
-- Allow doctors to SELECT pricing_config
CREATE POLICY "Doctors can select pricing"
ON public.pricing_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'doctor'));

-- Allow doctors to UPDATE pricing_config
CREATE POLICY "Doctors can update pricing"
ON public.pricing_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'doctor'));

-- Allow doctors to INSERT pricing_config
CREATE POLICY "Doctors can insert pricing"
ON public.pricing_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'doctor'));
