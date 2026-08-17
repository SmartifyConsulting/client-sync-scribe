
ALTER TABLE public.hospital_nurses
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS professional_title text,
  ADD COLUMN IF NOT EXISTS staff_id text,
  ADD COLUMN IF NOT EXISTS nursing_category text,
  ADD COLUMN IF NOT EXISTS registration_authority text,
  ADD COLUMN IF NOT EXISTS registration_expiry date,
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS employment_start_date date,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS reporting_manager text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS about_me text,
  ADD COLUMN IF NOT EXISTS scope_of_practice text,
  ADD COLUMN IF NOT EXISTS clinical_areas text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specialisations text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.nurse_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id uuid NOT NULL REFERENCES public.hospital_nurses(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text,
  obtained_on date,
  expires_on date,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nurse_clinical_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id uuid NOT NULL REFERENCES public.hospital_nurses(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  status text NOT NULL DEFAULT 'not_authorised'
    CHECK (status IN ('authorised','not_authorised','requires_supervision')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nurse_id, permission_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nurse_certifications TO authenticated;
GRANT ALL ON public.nurse_certifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nurse_clinical_permissions TO authenticated;
GRANT ALL ON public.nurse_clinical_permissions TO service_role;

ALTER TABLE public.nurse_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_clinical_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_own_nurse_record(_nurse_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_nurses n
    WHERE n.id = _nurse_id AND n.linked_user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.nurse_record_hospital(_nurse_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.hospital_id FROM public.hospital_nurses n WHERE n.id = _nurse_id
$$;

CREATE OR REPLACE FUNCTION public.is_nurse_record_admin(_nurse_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_hospital_admin(public.nurse_record_hospital(_nurse_id), auth.uid())
$$;

DROP POLICY IF EXISTS "Nurse reads own certifications" ON public.nurse_certifications;
CREATE POLICY "Nurse reads own certifications" ON public.nurse_certifications
  FOR SELECT TO authenticated
  USING (public.is_own_nurse_record(nurse_id) OR public.is_nurse_record_admin(nurse_id));

DROP POLICY IF EXISTS "Nurse adds own certifications" ON public.nurse_certifications;
CREATE POLICY "Nurse adds own certifications" ON public.nurse_certifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_own_nurse_record(nurse_id) OR public.is_nurse_record_admin(nurse_id));

DROP POLICY IF EXISTS "Hospital admin manages certifications" ON public.nurse_certifications;
CREATE POLICY "Hospital admin manages certifications" ON public.nurse_certifications
  FOR UPDATE TO authenticated
  USING (public.is_nurse_record_admin(nurse_id))
  WITH CHECK (public.is_nurse_record_admin(nurse_id));

DROP POLICY IF EXISTS "Hospital admin deletes certifications" ON public.nurse_certifications;
CREATE POLICY "Hospital admin deletes certifications" ON public.nurse_certifications
  FOR DELETE TO authenticated
  USING (public.is_nurse_record_admin(nurse_id));

DROP POLICY IF EXISTS "Nurse reads own permissions" ON public.nurse_clinical_permissions;
CREATE POLICY "Nurse reads own permissions" ON public.nurse_clinical_permissions
  FOR SELECT TO authenticated
  USING (public.is_own_nurse_record(nurse_id) OR public.is_nurse_record_admin(nurse_id));

DROP POLICY IF EXISTS "Hospital admin manages permissions" ON public.nurse_clinical_permissions;
CREATE POLICY "Hospital admin manages permissions" ON public.nurse_clinical_permissions
  FOR ALL TO authenticated
  USING (public.is_nurse_record_admin(nurse_id))
  WITH CHECK (public.is_nurse_record_admin(nurse_id));
