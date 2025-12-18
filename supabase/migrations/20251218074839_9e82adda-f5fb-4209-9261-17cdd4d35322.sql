-- Remove doctor access to health photos (privacy protection)
DROP POLICY IF EXISTS "Doctors can view health photos for their patients" ON public.health_photos;