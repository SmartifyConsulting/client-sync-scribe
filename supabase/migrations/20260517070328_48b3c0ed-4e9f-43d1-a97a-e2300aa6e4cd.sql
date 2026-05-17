
-- ============================================================
-- HOSPITAL NURSES ROSTER
-- ============================================================
CREATE TABLE public.hospital_nurses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.holarchelp_hospitals(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  nurse_registration_number text,
  email text,
  mobile_number text,
  role_title text,
  linked_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive')),
  pending_payload jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hospital_nurses_hospital ON public.hospital_nurses(hospital_id);
CREATE INDEX idx_hospital_nurses_linked ON public.hospital_nurses(linked_user_id);
CREATE UNIQUE INDEX uniq_hospital_nurses_email ON public.hospital_nurses(hospital_id, lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uniq_hospital_nurses_regno ON public.hospital_nurses(hospital_id, nurse_registration_number) WHERE nurse_registration_number IS NOT NULL;

ALTER TABLE public.hospital_nurses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff manage their nurses"
  ON public.hospital_nurses FOR ALL
  USING (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Nurse can view own roster row"
  ON public.hospital_nurses FOR SELECT
  USING (linked_user_id = auth.uid());

CREATE TRIGGER trg_hospital_nurses_updated_at
  BEFORE UPDATE ON public.hospital_nurses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- NURSE ATTRIBUTION ON EXISTING ADMISSION TABLES
-- ============================================================
ALTER TABLE public.admission_vitals       ADD COLUMN nurse_id uuid REFERENCES public.hospital_nurses(id) ON DELETE SET NULL,
                                          ADD COLUMN nurse_name_snapshot text;
ALTER TABLE public.admission_medications  ADD COLUMN nurse_id uuid REFERENCES public.hospital_nurses(id) ON DELETE SET NULL,
                                          ADD COLUMN nurse_name_snapshot text;
ALTER TABLE public.admission_lab_results  ADD COLUMN nurse_id uuid REFERENCES public.hospital_nurses(id) ON DELETE SET NULL,
                                          ADD COLUMN nurse_name_snapshot text;
ALTER TABLE public.admission_imaging      ADD COLUMN nurse_id uuid REFERENCES public.hospital_nurses(id) ON DELETE SET NULL,
                                          ADD COLUMN nurse_name_snapshot text;

-- ============================================================
-- ADMISSION INTERACTIONS LOG
-- ============================================================
CREATE TABLE public.admission_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  nurse_id uuid REFERENCES public.hospital_nurses(id) ON DELETE SET NULL,
  nurse_name_snapshot text NOT NULL,
  recorded_by_user_id uuid,
  interaction_type text NOT NULL CHECK (interaction_type IN ('vitals','observation','medication_given','procedure','note','other')),
  payload jsonb DEFAULT '{}'::jsonb,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admission_interactions_admission ON public.admission_interactions(admission_id);
CREATE INDEX idx_admission_interactions_nurse ON public.admission_interactions(nurse_id);
ALTER TABLE public.admission_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View interactions if can access admission"
  ON public.admission_interactions FOR SELECT
  USING (public.can_access_admission(admission_id));
CREATE POLICY "Insert interactions if can edit admission"
  ON public.admission_interactions FOR INSERT
  WITH CHECK (public.can_edit_admission(admission_id));
CREATE POLICY "Update interactions if can edit admission"
  ON public.admission_interactions FOR UPDATE
  USING (public.can_edit_admission(admission_id));
CREATE POLICY "Delete interactions if can edit admission"
  ON public.admission_interactions FOR DELETE
  USING (public.can_edit_admission(admission_id));

CREATE TRIGGER trg_admission_interactions_updated_at
  BEFORE UPDATE ON public.admission_interactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- NURSE RECORD RATINGS (patient rates nurse)
-- ============================================================
CREATE TABLE public.nurse_record_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  record_table text NOT NULL,
  record_id uuid NOT NULL,
  nurse_id uuid NOT NULL REFERENCES public.hospital_nurses(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_nurse_record_rating ON public.nurse_record_ratings(record_table, record_id, patient_user_id);
CREATE INDEX idx_nurse_record_ratings_nurse ON public.nurse_record_ratings(nurse_id);
ALTER TABLE public.nurse_record_ratings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_nurse_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_nurse_rating_validate
  BEFORE INSERT OR UPDATE ON public.nurse_record_ratings
  FOR EACH ROW EXECUTE FUNCTION public.validate_nurse_rating();

CREATE POLICY "Patient rates own admission nurse"
  ON public.nurse_record_ratings FOR INSERT
  WITH CHECK (patient_user_id = auth.uid() AND public.can_access_admission(admission_id));
CREATE POLICY "Patient updates own nurse rating"
  ON public.nurse_record_ratings FOR UPDATE
  USING (patient_user_id = auth.uid());
CREATE POLICY "View nurse ratings: patient, hospital, nurse, admin"
  ON public.nurse_record_ratings FOR SELECT
  USING (
    patient_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::user_role)
    OR EXISTS (
      SELECT 1 FROM public.hospital_nurses hn
      WHERE hn.id = nurse_record_ratings.nurse_id
        AND (hn.linked_user_id = auth.uid() OR public.is_hospital_staff(hn.hospital_id, auth.uid()))
    )
  );

-- ============================================================
-- NURSE PENDING VULAS (earn now, claim on signup)
-- ============================================================
CREATE TABLE public.nurse_pending_vulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_nurse_id uuid NOT NULL REFERENCES public.hospital_nurses(id) ON DELETE CASCADE,
  vulas_count integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  reference_id uuid,
  awarded_by uuid,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claimed_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE INDEX idx_nurse_pending_vulas_nurse ON public.nurse_pending_vulas(hospital_nurse_id);
CREATE INDEX idx_nurse_pending_vulas_claimed ON public.nurse_pending_vulas(claimed_user_id) WHERE claimed_user_id IS NOT NULL;
ALTER TABLE public.nurse_pending_vulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff & admin manage pending vulas"
  ON public.nurse_pending_vulas FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR EXISTS (SELECT 1 FROM public.hospital_nurses hn
               WHERE hn.id = nurse_pending_vulas.hospital_nurse_id
                 AND public.is_hospital_staff(hn.hospital_id, auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR EXISTS (SELECT 1 FROM public.hospital_nurses hn
               WHERE hn.id = nurse_pending_vulas.hospital_nurse_id
                 AND public.is_hospital_staff(hn.hospital_id, auth.uid()))
  );

CREATE POLICY "Linked nurse can view own pending vulas"
  ON public.nurse_pending_vulas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.hospital_nurses hn
    WHERE hn.id = nurse_pending_vulas.hospital_nurse_id
      AND hn.linked_user_id = auth.uid()
  ));

-- ============================================================
-- AWARD VULAS ON HIGH RATING
-- ============================================================
CREATE OR REPLACE FUNCTION public.award_nurse_rating_vulas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.rating >= 4 THEN
    INSERT INTO public.nurse_pending_vulas(hospital_nurse_id, vulas_count, reason, reference_id, awarded_by)
    VALUES (NEW.nurse_id, NEW.rating * 10, 'patient_rating', NEW.id, NEW.patient_user_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_award_nurse_rating_vulas
  AFTER INSERT ON public.nurse_record_ratings
  FOR EACH ROW EXECUTE FUNCTION public.award_nurse_rating_vulas();

-- ============================================================
-- CLAIM PENDING VULAS WHEN NURSE STUB IS LINKED TO A USER
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_nurse_pending_vulas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.linked_user_id IS NOT NULL
     AND (OLD.linked_user_id IS NULL OR OLD.linked_user_id <> NEW.linked_user_id) THEN
    UPDATE public.nurse_pending_vulas
      SET claimed_at = now(),
          claimed_user_id = NEW.linked_user_id
      WHERE hospital_nurse_id = NEW.id
        AND claimed_at IS NULL;
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_claim_nurse_pending_vulas
  BEFORE UPDATE ON public.hospital_nurses
  FOR EACH ROW EXECUTE FUNCTION public.claim_nurse_pending_vulas();

-- ============================================================
-- LINK PENDING NURSE STUBS WHEN PROFILE IS CREATED
-- ============================================================
CREATE OR REPLACE FUNCTION public.link_pending_nurse_stubs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.id;
  UPDATE public.hospital_nurses hn
    SET linked_user_id = NEW.id,
        status = 'active',
        updated_at = now()
    WHERE hn.linked_user_id IS NULL
      AND (
        (NEW.practice_number IS NOT NULL AND hn.nurse_registration_number = NEW.practice_number)
        OR (_email IS NOT NULL AND lower(hn.email) = lower(_email))
      );
  RETURN NEW;
END $$;
CREATE TRIGGER trg_link_pending_nurse_stubs
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_pending_nurse_stubs();
