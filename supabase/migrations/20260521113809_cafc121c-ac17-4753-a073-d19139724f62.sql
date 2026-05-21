CREATE OR REPLACE FUNCTION public.sync_profile_role_for_emergency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('hospital_staff'::public.user_role, 'ambulance_staff'::public.user_role, 'blood_bank'::public.user_role, 'pharmacy_staff'::public.user_role) THEN
    UPDATE public.profiles
      SET role = NULL
      WHERE id = NEW.user_id
        AND role IN ('patient'::public.user_role, 'doctor'::public.user_role);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_role_for_emergency_trigger ON public.user_roles;

CREATE TRIGGER sync_profile_role_for_emergency_trigger
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_role_for_emergency();