
-- 1) Remove self-service role escalation
DROP POLICY IF EXISTS "Users can insert their own non-admin role" ON public.user_roles;

-- 2) Restrict ambulance provider full-record reads to admins/owners
DROP POLICY IF EXISTS "Members can view their ambulance" ON public.holarchelp_ambulance_providers;
CREATE POLICY "Admins and owners can view their ambulance"
  ON public.holarchelp_ambulance_providers
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR public.is_ambulance_admin(id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.user_role)
  );

-- 3) Restrict hospital full-record reads to admins/owners
DROP POLICY IF EXISTS "Members can view their hospital" ON public.holarchelp_hospitals;
CREATE POLICY "Admins and owners can view their hospital"
  ON public.holarchelp_hospitals
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR public.is_hospital_admin(id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.user_role)
  );
