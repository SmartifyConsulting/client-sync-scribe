-- Nurses are dedicated to a single ward and must not see other wards' patients.
ALTER TABLE public.hospital_nurses
  ADD COLUMN IF NOT EXISTS ward_id uuid REFERENCES public.hospital_wards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS hospital_nurses_ward_id_idx ON public.hospital_nurses(ward_id);

-- Returns the ward a signed-in nurse is assigned to at a hospital, or NULL when
-- the user is not a rostered nurse there (doctors/admins keep full access).
CREATE OR REPLACE FUNCTION public.nurse_ward_id(_hospital_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.ward_id
  FROM public.hospital_nurses n
  WHERE n.linked_user_id = _user_id
    AND n.hospital_id = _hospital_id
  ORDER BY n.updated_at DESC NULLS LAST
  LIMIT 1
$$;

-- True when the user is a rostered nurse at this hospital (any ward).
CREATE OR REPLACE FUNCTION public.is_hospital_nurse(_hospital_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_nurses n
    WHERE n.linked_user_id = _user_id
      AND n.hospital_id = _hospital_id
  )
$$;

-- Scope: a nurse only sees her own ward; everyone else is unaffected.
CREATE OR REPLACE FUNCTION public.can_see_ward(_ward_id uuid, _hospital_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.is_hospital_nurse(_hospital_id, _user_id) THEN true
    WHEN public.nurse_ward_id(_hospital_id, _user_id) IS NULL THEN false
    ELSE public.nurse_ward_id(_hospital_id, _user_id) = _ward_id
  END
$$;

GRANT EXECUTE ON FUNCTION public.nurse_ward_id(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hospital_nurse(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_ward(uuid, uuid, uuid) TO authenticated;

-- Wards
DROP POLICY IF EXISTS "wards readable by hospital staff and clinicians" ON public.hospital_wards;
CREATE POLICY "wards readable by hospital staff and clinicians"
ON public.hospital_wards FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR (is_hospital_staff(hospital_id, auth.uid()) AND can_see_ward(id, hospital_id, auth.uid()))
);

-- Beds
DROP POLICY IF EXISTS "beds visible to hospital staff" ON public.hospital_beds;
CREATE POLICY "beds visible to hospital staff"
ON public.hospital_beds FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR (
    is_hospital_staff(hospital_of_ward(ward_id), auth.uid())
    AND can_see_ward(ward_id, hospital_of_ward(ward_id), auth.uid())
  )
);

-- Inpatient admissions
DROP POLICY IF EXISTS "admissions managed by hospital staff" ON public.hospital_inpatient_admissions;
CREATE POLICY "admissions managed by hospital staff"
ON public.hospital_inpatient_admissions FOR ALL
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR (
    is_hospital_staff(hospital_id, auth.uid())
    AND can_see_ward(ward_id, hospital_id, auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role)
  OR (
    is_hospital_staff(hospital_id, auth.uid())
    AND can_see_ward(ward_id, hospital_id, auth.uid())
  )
);