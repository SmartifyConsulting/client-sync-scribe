-- 1. Prevent doctors (or anyone other than the patient) from changing request status
CREATE OR REPLACE FUNCTION public.enforce_access_request_status_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NULL OR auth.uid() <> OLD.patient_user_id THEN
      RAISE EXCEPTION 'Only the patient can change the status of an access request';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_access_request_status_owner ON public.doctor_access_requests;
CREATE TRIGGER enforce_access_request_status_owner
BEFORE UPDATE ON public.doctor_access_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_access_request_status_owner();

-- Also add missing WITH CHECK on the patient update policy so patients cannot reassign rows
DROP POLICY IF EXISTS "Patients can update their access requests" ON public.doctor_access_requests;
CREATE POLICY "Patients can update their access requests"
ON public.doctor_access_requests FOR UPDATE
TO authenticated
USING (auth.uid() = patient_user_id)
WITH CHECK (auth.uid() = patient_user_id);

-- Doctors update policy: keep row scoping, add WITH CHECK so they cannot re-target rows
DROP POLICY IF EXISTS "Doctors can update requests for them" ON public.doctor_access_requests;
CREATE POLICY "Doctors can update requests for them"
ON public.doctor_access_requests FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'doctor'::user_role)
  AND length(btrim(doctor_practice_number)) > 0
  AND length(btrim(doctor_registration_number)) > 0
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.practice_number = doctor_access_requests.doctor_practice_number
      AND p.doctor_number = doctor_access_requests.doctor_registration_number
  )
)
WITH CHECK (
  has_role(auth.uid(), 'doctor'::user_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.practice_number = doctor_access_requests.doctor_practice_number
      AND p.doctor_number = doctor_access_requests.doctor_registration_number
  )
);

-- 2. Pricing config: restrict reads to signed-in users (not anonymous visitors)
DROP POLICY IF EXISTS "Anyone can view pricing" ON public.pricing_config;
CREATE POLICY "Authenticated users can view pricing"
ON public.pricing_config FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.pricing_config FROM anon;
GRANT SELECT ON public.pricing_config TO authenticated;
GRANT ALL ON public.pricing_config TO service_role;