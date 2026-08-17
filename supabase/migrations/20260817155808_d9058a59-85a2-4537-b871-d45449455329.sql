
CREATE OR REPLACE FUNCTION public.hospital_nurses_lock_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_hospital_admin(NEW.hospital_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::user_role) THEN
    RETURN NEW;
  END IF;
  NEW.hospital_id := OLD.hospital_id;
  NEW.ward_id := OLD.ward_id;
  NEW.status := OLD.status;
  NEW.linked_user_id := OLD.linked_user_id;
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hospital_nurses_lock_admin_fields ON public.hospital_nurses;
CREATE TRIGGER hospital_nurses_lock_admin_fields
  BEFORE UPDATE ON public.hospital_nurses
  FOR EACH ROW EXECUTE FUNCTION public.hospital_nurses_lock_admin_fields();

DROP POLICY IF EXISTS "Nurse updates own roster row" ON public.hospital_nurses;
CREATE POLICY "Nurse updates own roster row" ON public.hospital_nurses
  FOR UPDATE TO authenticated
  USING (linked_user_id = auth.uid())
  WITH CHECK (linked_user_id = auth.uid());
