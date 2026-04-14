CREATE POLICY "Doctors can view requesting patient profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_access_requests dar
    JOIN public.profiles dp ON dp.practice_number = dar.doctor_practice_number
      AND dp.doctor_number = dar.doctor_registration_number
    WHERE dar.patient_user_id = profiles.id
      AND dp.id = auth.uid()
  )
);