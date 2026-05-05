
-- 1. EMERGENCY CONTACT fields on patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_email text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nok_can_view_profile boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nok_can_view_live_tracking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_can_view_profile boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_can_view_live_tracking boolean DEFAULT true;

-- 2. PROFILE SHARES
CREATE TABLE IF NOT EXISTS public.patient_profile_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  shared_with_user_id uuid,
  shared_with_username text,
  shared_with_email text,
  relationship text,
  can_view_profile boolean NOT NULL DEFAULT true,
  can_view_live_tracking boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual',
  linked_contact_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pps_owner ON public.patient_profile_shares(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pps_shared_with ON public.patient_profile_shares(shared_with_user_id);

ALTER TABLE public.patient_profile_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own shares"
  ON public.patient_profile_shares
  FOR ALL TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Recipients view their shares"
  ON public.patient_profile_shares
  FOR SELECT TO authenticated
  USING (auth.uid() = shared_with_user_id);

CREATE TRIGGER tr_pps_updated_at
  BEFORE UPDATE ON public.patient_profile_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- helper
CREATE OR REPLACE FUNCTION public.has_profile_share(_owner uuid, _viewer uuid, _live_tracking boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_profile_shares
    WHERE owner_user_id = _owner
      AND shared_with_user_id = _viewer
      AND can_view_profile = true
      AND (NOT _live_tracking OR can_view_live_tracking = true)
  );
$$;

-- 3. PRESCRIPTIONS reminders + self-source
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS reminder_times text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS with_food text DEFAULT 'either',
  ADD COLUMN IF NOT EXISTS refill_reminder_days integer DEFAULT 7,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'doctor',
  ADD COLUMN IF NOT EXISTS approved_medication_id uuid;

-- 4. APPROVED DAILY MEDICATIONS
CREATE TABLE IF NOT EXISTS public.approved_daily_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'supplement',
  default_with_food text DEFAULT 'either',
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approved_daily_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read approved meds"
  ON public.approved_daily_medications
  FOR SELECT TO authenticated USING (active = true);

CREATE POLICY "Admins manage approved meds"
  ON public.approved_daily_medications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

ALTER TABLE public.prescriptions
  ADD CONSTRAINT prescriptions_approved_med_fk
  FOREIGN KEY (approved_medication_id) REFERENCES public.approved_daily_medications(id) ON DELETE SET NULL;

-- 5. HOSPITAL ADMISSIONS multi-source
ALTER TABLE public.hospital_admissions
  ALTER COLUMN doctor_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'doctor',
  ADD COLUMN IF NOT EXISTS hospital_provider_id uuid REFERENCES public.holarchelp_hospitals(id) ON DELETE SET NULL;

UPDATE public.hospital_admissions SET created_by = doctor_id WHERE created_by IS NULL;

-- Replace insert policy to allow patient and hospital sources
DROP POLICY IF EXISTS "Authorized users can insert admissions" ON public.hospital_admissions;

CREATE POLICY "Authorized users can insert admissions"
  ON public.hospital_admissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      -- patient logging their own
      EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.patient_user_id = auth.uid())
      -- doctor with access to patient
      OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.patients p
        JOIN public.doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
        WHERE p.id = patient_id AND dpa.doctor_id = auth.uid() AND dpa.is_active = true
      )
      -- hospital staff for their provider
      OR (
        hospital_provider_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.holarchelp_hospital_members m
                    WHERE m.hospital_id = hospital_provider_id AND m.user_id = auth.uid())
      )
    )
  );

-- Update access helper to include profile-shares + hospital staff
CREATE OR REPLACE FUNCTION public.can_access_admission(_admission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_admissions ha
    JOIN public.patients p ON p.id = ha.patient_id
    WHERE ha.id = _admission_id
      AND (
        p.patient_user_id = auth.uid()
        OR ha.doctor_id = auth.uid()
        OR ha.created_by = auth.uid()
        OR p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.doctor_patient_access dpa
          WHERE dpa.patient_user_id = p.patient_user_id
            AND dpa.doctor_id = auth.uid()
            AND dpa.is_active = true
        )
        OR (
          ha.hospital_provider_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM public.holarchelp_hospital_members m
                      WHERE m.hospital_id = ha.hospital_provider_id AND m.user_id = auth.uid())
        )
        OR public.has_profile_share(p.patient_user_id, auth.uid(), false)
      )
  );
$$;

-- 6. Extend SELECT policies on key tables to honor profile shares
CREATE POLICY "Profile shares can view patient"
  ON public.patients FOR SELECT TO authenticated
  USING (patient_user_id IS NOT NULL AND public.has_profile_share(patient_user_id, auth.uid(), false));

CREATE POLICY "Profile shares can view prescriptions"
  ON public.prescriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescriptions.patient_id
      AND p.patient_user_id IS NOT NULL
      AND public.has_profile_share(p.patient_user_id, auth.uid(), false)
  ));

CREATE POLICY "Profile shares can view adherence"
  ON public.medication_adherence FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medication_adherence.patient_id
      AND p.patient_user_id IS NOT NULL
      AND public.has_profile_share(p.patient_user_id, auth.uid(), false)
  ));

CREATE POLICY "Profile shares can view incidents (live tracking)"
  ON public.holarchelp_incidents FOR SELECT TO authenticated
  USING (public.has_profile_share(user_id, auth.uid(), true));

-- Patients can self-prescribe (for daily meds)
CREATE POLICY "Patients can self-create prescriptions"
  ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (
    source = 'self'
    AND auth.uid() = doctor_id
    AND EXISTS (SELECT 1 FROM public.patients p
                WHERE p.id = patient_id AND p.patient_user_id = auth.uid())
  );

CREATE POLICY "Patients can update own self-prescriptions"
  ON public.prescriptions FOR UPDATE TO authenticated
  USING (
    source = 'self' AND auth.uid() = doctor_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.patient_user_id = auth.uid())
  );

CREATE POLICY "Patients can delete own self-prescriptions"
  ON public.prescriptions FOR DELETE TO authenticated
  USING (
    source = 'self' AND auth.uid() = doctor_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.patient_user_id = auth.uid())
  );
