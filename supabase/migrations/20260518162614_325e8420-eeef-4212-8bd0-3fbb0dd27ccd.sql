
-- 1. Appointments: drop the overly-permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated can see appointment time windows" ON public.appointments;

-- 2. Ambulance coverage areas
DROP POLICY IF EXISTS "aca_select_auth" ON public.ambulance_coverage_areas;
CREATE POLICY "aca_select_staff_admin" ON public.ambulance_coverage_areas
FOR SELECT TO authenticated
USING (
  public.is_ambulance_staff(provider_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.user_role)
);

-- 3. Ambulance fleet
DROP POLICY IF EXISTS "af_select_auth" ON public.ambulance_fleet;
CREATE POLICY "af_select_staff_admin" ON public.ambulance_fleet
FOR SELECT TO authenticated
USING (
  public.is_ambulance_staff(provider_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.user_role)
);

-- 4. Hospital-doctor affiliations
DROP POLICY IF EXISTS "hda_select_auth" ON public.hospital_doctor_affiliations;
CREATE POLICY "hda_select_scoped" ON public.hospital_doctor_affiliations
FOR SELECT TO authenticated
USING (
  doctor_id = auth.uid()
  OR public.is_hospital_staff(hospital_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.user_role)
);

-- 5. Vula partner apps: only show active to non-admins
DROP POLICY IF EXISTS "Anyone can view active partner apps" ON public.vula_partner_apps;
CREATE POLICY "Anyone can view active partner apps" ON public.vula_partner_apps
FOR SELECT TO authenticated
USING (is_active = true);

-- 6. Bug reports: replace the broken self-referential UPDATE policy
--    with a clean owner-or-admin policy + trigger enforcing status lock.
DROP POLICY IF EXISTS "Owners edit own (no status), admins edit all" ON public.bug_reports;
CREATE POLICY "Owners or admins edit bug reports" ON public.bug_reports
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE OR REPLACE FUNCTION public.bug_reports_enforce_status_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can change bug report status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bug_reports_status_lock ON public.bug_reports;
CREATE TRIGGER bug_reports_status_lock
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.bug_reports_enforce_status_lock();

-- 7. patient-media bucket: scope read/update/delete to the owner's folder.
DROP POLICY IF EXISTS "Users can read their media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;

CREATE POLICY "patient_media_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "patient_media_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "patient_media_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'patient-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'patient-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "patient_media_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'patient-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
