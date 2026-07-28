-- 1) doctor_access_requests: policy-level guard so only the patient can move a request out of 'pending'
CREATE POLICY "Only patient may set non-pending status"
ON public.doctor_access_requests
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (auth.uid() = patient_user_id OR status = 'pending');

-- harden the existing trigger: block re-pointing a request at another patient
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

  IF NEW.patient_user_id IS DISTINCT FROM OLD.patient_user_id THEN
    RAISE EXCEPTION 'The patient of an access request cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

-- 2) holarchelp_incidents: assigned provider staff may only edit active incidents
DROP POLICY IF EXISTS "Assigned provider staff can update incident" ON public.holarchelp_incidents;

CREATE POLICY "Assigned provider staff can update incident"
ON public.holarchelp_incidents
FOR UPDATE
TO authenticated
USING (
  assigned_provider_id IS NOT NULL
  AND status NOT IN ('completed', 'cancelled')
  AND (is_ambulance_staff(assigned_provider_id, auth.uid()) OR is_hospital_staff(assigned_provider_id, auth.uid()))
)
WITH CHECK (
  assigned_provider_id IS NOT NULL
  AND (is_ambulance_staff(assigned_provider_id, auth.uid()) OR is_hospital_staff(assigned_provider_id, auth.uid()))
);

CREATE OR REPLACE FUNCTION public.holarchelp_enforce_incident_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- the patient/owner, admins and SECURITY DEFINER RPCs are unaffected
  IF auth.uid() IS NULL
     OR auth.uid() = OLD.user_id
     OR has_role(auth.uid(), 'admin'::user_role) THEN
    RETURN NEW;
  END IF;

  IF OLD.assigned_provider_id IS NOT NULL
     AND (is_ambulance_staff(OLD.assigned_provider_id, auth.uid())
          OR is_hospital_staff(OLD.assigned_provider_id, auth.uid())) THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'The patient of an incident cannot be changed';
    END IF;
    IF NEW.assigned_provider_id IS DISTINCT FROM OLD.assigned_provider_id THEN
      RAISE EXCEPTION 'Assigned provider can only be changed through the dispatch functions';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_holarchelp_enforce_incident_update_scope ON public.holarchelp_incidents;
CREATE TRIGGER trg_holarchelp_enforce_incident_update_scope
BEFORE UPDATE ON public.holarchelp_incidents
FOR EACH ROW EXECUTE FUNCTION public.holarchelp_enforce_incident_update_scope();

-- 3) holarchelp_provider_locations: simulated flag also restricted on UPDATE
CREATE POLICY "Only admins may write simulated locations on update"
ON public.holarchelp_provider_locations
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (simulated = false OR has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (simulated = false OR has_role(auth.uid(), 'admin'::user_role));