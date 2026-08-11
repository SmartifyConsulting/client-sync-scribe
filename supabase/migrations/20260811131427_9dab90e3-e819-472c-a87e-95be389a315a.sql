
-- 1. Helper: is this patient currently admitted at a hospital the caller staffs?
CREATE OR REPLACE FUNCTION public.patient_admitted_at_my_hospital(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hospital_inpatient_admissions a
    WHERE a.patient_id = _patient_id
      AND a.status = 'admitted'
      AND public.is_hospital_staff(a.hospital_id, auth.uid())
  )
$$;

CREATE POLICY "Hospital staff view admitted patients"
ON public.patients FOR SELECT TO authenticated
USING (public.patient_admitted_at_my_hospital(id));

-- 2. Backfill patient records for unlinked Holarc General admissions
DO $$
DECLARE
  r RECORD;
  new_id uuid;
  owner uuid := '54fa34d8-9705-4407-a825-19c5756ca184';
BEGIN
  FOR r IN
    SELECT id, patient_name FROM public.hospital_inpatient_admissions
    WHERE patient_id IS NULL AND hospital_id = '217bbf9f-bca8-42de-9d86-4a7f1b03488e'
  LOOP
    INSERT INTO public.patients (user_id, name, status, is_sample)
    VALUES (owner, btrim(replace(r.patient_name, '(Sample)', '')), 'active', true)
    RETURNING id INTO new_id;

    UPDATE public.hospital_inpatient_admissions SET patient_id = new_id WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Merge the duplicate Georgia Adams into the active record
UPDATE public.documents
SET patient_id = '2ea545a3-a3f5-4948-97aa-0baae686eacb'
WHERE patient_id = '883dae7e-6606-4384-8452-02d733ec094a';

DELETE FROM public.patients WHERE id = '883dae7e-6606-4384-8452-02d733ec094a';
