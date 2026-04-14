
-- Drop the recursive policy
DROP POLICY IF EXISTS "Doctors can view requesting patient profiles" ON public.profiles;

-- Create a SECURITY DEFINER function to check doctor-patient request link
CREATE OR REPLACE FUNCTION public.doctor_has_access_request_from(patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM doctor_access_requests dar
    JOIN profiles dp ON dp.practice_number = dar.doctor_practice_number
      AND dp.doctor_number = dar.doctor_registration_number
    WHERE dar.patient_user_id = patient_id
      AND dp.id = auth.uid()
  )
$$;

-- Recreate policy using the function (no self-join in the policy itself)
CREATE POLICY "Doctors can view requesting patient profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.doctor_has_access_request_from(id));
