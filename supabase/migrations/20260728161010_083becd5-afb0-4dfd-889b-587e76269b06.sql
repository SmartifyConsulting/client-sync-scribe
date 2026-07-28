
-- ===== WARDS =====
CREATE TABLE public.hospital_wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.holarchelp_hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  ward_type text NOT NULL DEFAULT 'general',
  bed_capacity integer NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_wards TO authenticated;
GRANT ALL ON public.hospital_wards TO service_role;
ALTER TABLE public.hospital_wards ENABLE ROW LEVEL SECURITY;

-- ===== BEDS =====
CREATE TABLE public.hospital_beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL REFERENCES public.hospital_wards(id) ON DELETE CASCADE,
  bed_number text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ward_id, bed_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_beds TO authenticated;
GRANT ALL ON public.hospital_beds TO service_role;
ALTER TABLE public.hospital_beds ENABLE ROW LEVEL SECURITY;

-- ===== INPATIENT ADMISSIONS =====
CREATE TABLE public.hospital_inpatient_admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.holarchelp_hospitals(id) ON DELETE CASCADE,
  ward_id uuid REFERENCES public.hospital_wards(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_user_id uuid,
  patient_name text NOT NULL,
  bed_number text,
  admitted_at timestamptz NOT NULL DEFAULT now(),
  discharged_at timestamptz,
  status text NOT NULL DEFAULT 'admitted',
  reason text,
  source text NOT NULL DEFAULT 'walk_in',
  incident_id uuid,
  created_by uuid,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inpatient_hospital_status ON public.hospital_inpatient_admissions(hospital_id, status);
CREATE INDEX idx_inpatient_ward ON public.hospital_inpatient_admissions(ward_id);
CREATE INDEX idx_inpatient_patient ON public.hospital_inpatient_admissions(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_inpatient_admissions TO authenticated;
GRANT ALL ON public.hospital_inpatient_admissions TO service_role;
ALTER TABLE public.hospital_inpatient_admissions ENABLE ROW LEVEL SECURITY;

-- ===== WARD TRANSFERS =====
CREATE TABLE public.hospital_ward_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_inpatient_admissions(id) ON DELETE CASCADE,
  from_ward_id uuid REFERENCES public.hospital_wards(id) ON DELETE SET NULL,
  to_ward_id uuid REFERENCES public.hospital_wards(id) ON DELETE SET NULL,
  from_bed_number text,
  to_bed_number text,
  reason text,
  moved_by uuid,
  moved_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hospital_ward_transfers TO authenticated;
GRANT ALL ON public.hospital_ward_transfers TO service_role;
ALTER TABLE public.hospital_ward_transfers ENABLE ROW LEVEL SECURITY;

-- ===== ATTENDING DOCTORS =====
CREATE TABLE public.hospital_attending_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_inpatient_admissions(id) ON DELETE CASCADE,
  doctor_id uuid,
  doctor_name text NOT NULL,
  specialty text,
  is_primary boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attending_admission ON public.hospital_attending_doctors(admission_id);
CREATE INDEX idx_attending_doctor ON public.hospital_attending_doctors(doctor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_attending_doctors TO authenticated;
GRANT ALL ON public.hospital_attending_doctors TO service_role;
ALTER TABLE public.hospital_attending_doctors ENABLE ROW LEVEL SECURITY;

-- ===== STAFF SHIFTS =====
CREATE TABLE public.hospital_staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.holarchelp_hospitals(id) ON DELETE CASCADE,
  ward_id uuid REFERENCES public.hospital_wards(id) ON DELETE SET NULL,
  staff_role text NOT NULL,
  doctor_id uuid,
  nurse_id uuid REFERENCES public.hospital_nurses(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  shift_type text NOT NULL DEFAULT 'day',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  clocked_in_at timestamptz,
  clocked_out_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_shift_one_staff CHECK (
    (doctor_id IS NOT NULL AND nurse_id IS NULL)
    OR (doctor_id IS NULL AND nurse_id IS NOT NULL)
  )
);
CREATE INDEX idx_shift_hospital_time ON public.hospital_staff_shifts(hospital_id, starts_at);
CREATE INDEX idx_shift_ward ON public.hospital_staff_shifts(ward_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_staff_shifts TO authenticated;
GRANT ALL ON public.hospital_staff_shifts TO service_role;
ALTER TABLE public.hospital_staff_shifts ENABLE ROW LEVEL SECURITY;

-- ===== NURSE ASSIGNMENTS (attending nurses) =====
CREATE TABLE public.hospital_nurse_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_inpatient_admissions(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES public.hospital_staff_shifts(id) ON DELETE SET NULL,
  nurse_id uuid REFERENCES public.hospital_nurses(id) ON DELETE SET NULL,
  nurse_name text NOT NULL,
  care_role text NOT NULL DEFAULT 'primary',
  care_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nurse_assign_admission ON public.hospital_nurse_assignments(admission_id);
CREATE INDEX idx_nurse_assign_shift ON public.hospital_nurse_assignments(shift_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_nurse_assignments TO authenticated;
GRANT ALL ON public.hospital_nurse_assignments TO service_role;
ALTER TABLE public.hospital_nurse_assignments ENABLE ROW LEVEL SECURITY;

-- ===== PATIENT ACTIVITY LOG =====
CREATE TABLE public.patient_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_user_id uuid,
  admission_id uuid REFERENCES public.hospital_inpatient_admissions(id) ON DELETE SET NULL,
  hospital_id uuid REFERENCES public.holarchelp_hospitals(id) ON DELETE SET NULL,
  ward_id uuid REFERENCES public.hospital_wards(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  details text,
  staff_user_id uuid,
  staff_name text,
  staff_role text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_patient_time ON public.patient_activity_logs(patient_id, occurred_at DESC);
CREATE INDEX idx_activity_hospital_time ON public.patient_activity_logs(hospital_id, occurred_at DESC);
GRANT SELECT, INSERT ON public.patient_activity_logs TO authenticated;
GRANT ALL ON public.patient_activity_logs TO service_role;
ALTER TABLE public.patient_activity_logs ENABLE ROW LEVEL SECURITY;

-- ===== HELPER FUNCTIONS =====
CREATE OR REPLACE FUNCTION public.hospital_of_ward(_ward_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hospital_id FROM public.hospital_wards WHERE id = _ward_id
$$;

CREATE OR REPLACE FUNCTION public.can_view_inpatient_admission(_admission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_inpatient_admissions a
    LEFT JOIN public.patients p ON p.id = a.patient_id
    WHERE a.id = _admission_id
      AND (
        public.is_hospital_staff(a.hospital_id, auth.uid())
        OR public.has_role(auth.uid(), 'admin'::user_role)
        OR a.patient_user_id = auth.uid()
        OR p.patient_user_id = auth.uid()
        OR p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.hospital_attending_doctors d
          WHERE d.admission_id = a.id AND d.doctor_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.doctor_patient_access dpa
          WHERE dpa.patient_user_id = COALESCE(a.patient_user_id, p.patient_user_id)
            AND dpa.doctor_id = auth.uid() AND dpa.is_active = true
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_log_patient_activity(_patient_id uuid, _hospital_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::user_role)
    OR (_hospital_id IS NOT NULL AND public.is_hospital_staff(_hospital_id, auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = _patient_id
        AND (
          p.user_id = auth.uid()
          OR p.patient_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctor_patient_access dpa
            WHERE dpa.patient_user_id = p.patient_user_id
              AND dpa.doctor_id = auth.uid() AND dpa.is_active = true
          )
        )
    )
$$;

-- ===== POLICIES =====
CREATE POLICY "wards readable by hospital staff and clinicians"
  ON public.hospital_wards FOR SELECT TO authenticated
  USING (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));
CREATE POLICY "wards managed by hospital admins"
  ON public.hospital_wards FOR ALL TO authenticated
  USING (public.is_hospital_admin(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role))
  WITH CHECK (public.is_hospital_admin(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));

CREATE POLICY "beds visible to hospital staff"
  ON public.hospital_beds FOR SELECT TO authenticated
  USING (public.is_hospital_staff(public.hospital_of_ward(ward_id), auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));
CREATE POLICY "beds managed by hospital admins"
  ON public.hospital_beds FOR ALL TO authenticated
  USING (public.is_hospital_admin(public.hospital_of_ward(ward_id), auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role))
  WITH CHECK (public.is_hospital_admin(public.hospital_of_ward(ward_id), auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));

CREATE POLICY "admissions visible to care circle"
  ON public.hospital_inpatient_admissions FOR SELECT TO authenticated
  USING (public.can_view_inpatient_admission(id));
CREATE POLICY "admissions managed by hospital staff"
  ON public.hospital_inpatient_admissions FOR ALL TO authenticated
  USING (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role))
  WITH CHECK (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));

CREATE POLICY "transfers visible with admission"
  ON public.hospital_ward_transfers FOR SELECT TO authenticated
  USING (public.can_view_inpatient_admission(admission_id));
CREATE POLICY "transfers created by hospital staff"
  ON public.hospital_ward_transfers FOR INSERT TO authenticated
  WITH CHECK (public.can_view_inpatient_admission(admission_id));

CREATE POLICY "attending doctors visible with admission"
  ON public.hospital_attending_doctors FOR SELECT TO authenticated
  USING (public.can_view_inpatient_admission(admission_id));
CREATE POLICY "attending doctors managed with admission"
  ON public.hospital_attending_doctors FOR ALL TO authenticated
  USING (public.can_view_inpatient_admission(admission_id))
  WITH CHECK (public.can_view_inpatient_admission(admission_id));

CREATE POLICY "shifts visible to hospital staff and owner"
  ON public.hospital_staff_shifts FOR SELECT TO authenticated
  USING (
    public.is_hospital_staff(hospital_id, auth.uid())
    OR public.has_role(auth.uid(),'admin'::user_role)
    OR doctor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.hospital_nurses n WHERE n.id = nurse_id AND n.linked_user_id = auth.uid())
  );
CREATE POLICY "shifts managed by hospital staff"
  ON public.hospital_staff_shifts FOR ALL TO authenticated
  USING (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role))
  WITH CHECK (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::user_role));
CREATE POLICY "staff can clock their own shift"
  ON public.hospital_staff_shifts FOR UPDATE TO authenticated
  USING (
    doctor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.hospital_nurses n WHERE n.id = nurse_id AND n.linked_user_id = auth.uid())
  )
  WITH CHECK (
    doctor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.hospital_nurses n WHERE n.id = nurse_id AND n.linked_user_id = auth.uid())
  );

CREATE POLICY "nurse assignments visible with admission"
  ON public.hospital_nurse_assignments FOR SELECT TO authenticated
  USING (
    public.can_view_inpatient_admission(admission_id)
    OR EXISTS (SELECT 1 FROM public.hospital_nurses n WHERE n.id = nurse_id AND n.linked_user_id = auth.uid())
  );
CREATE POLICY "nurse assignments managed with admission"
  ON public.hospital_nurse_assignments FOR ALL TO authenticated
  USING (public.can_view_inpatient_admission(admission_id))
  WITH CHECK (public.can_view_inpatient_admission(admission_id));

CREATE POLICY "activity logs visible to care circle"
  ON public.patient_activity_logs FOR SELECT TO authenticated
  USING (public.can_log_patient_activity(patient_id, hospital_id));
CREATE POLICY "activity logs created by care circle"
  ON public.patient_activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.can_log_patient_activity(patient_id, hospital_id));

-- ===== TRIGGERS: updated_at =====
CREATE TRIGGER trg_wards_updated BEFORE UPDATE ON public.hospital_wards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_beds_updated BEFORE UPDATE ON public.hospital_beds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inpatient_updated BEFORE UPDATE ON public.hospital_inpatient_admissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_attending_updated BEFORE UPDATE ON public.hospital_attending_doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shifts_updated BEFORE UPDATE ON public.hospital_staff_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nurse_assign_updated BEFORE UPDATE ON public.hospital_nurse_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== TRIGGERS: automatic activity logging =====
CREATE OR REPLACE FUNCTION public.log_inpatient_admission_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ward text; _actor text;
BEGIN
  SELECT name INTO _ward FROM public.hospital_wards WHERE id = NEW.ward_id;
  SELECT full_name INTO _actor FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.patient_activity_logs(patient_id, patient_user_id, admission_id, hospital_id, ward_id, action_type, details, staff_user_id, staff_name, staff_role)
    VALUES (NEW.patient_id, NEW.patient_user_id, NEW.id, NEW.hospital_id, NEW.ward_id, 'admission',
            'Admitted to ' || COALESCE(_ward,'hospital') || COALESCE(', bed ' || NEW.bed_number, ''),
            auth.uid(), COALESCE(_actor,'Hospital staff'), 'hospital_staff');
    RETURN NEW;
  END IF;

  IF NEW.status = 'discharged' AND OLD.status IS DISTINCT FROM 'discharged' THEN
    INSERT INTO public.patient_activity_logs(patient_id, patient_user_id, admission_id, hospital_id, ward_id, action_type, details, staff_user_id, staff_name, staff_role)
    VALUES (NEW.patient_id, NEW.patient_user_id, NEW.id, NEW.hospital_id, NEW.ward_id, 'discharge',
            'Discharged from ' || COALESCE(_ward,'hospital'),
            auth.uid(), COALESCE(_actor,'Hospital staff'), 'hospital_staff');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_inpatient_admission
  AFTER INSERT OR UPDATE ON public.hospital_inpatient_admissions
  FOR EACH ROW EXECUTE FUNCTION public.log_inpatient_admission_activity();

CREATE OR REPLACE FUNCTION public.log_ward_transfer_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.hospital_inpatient_admissions; _from text; _to text;
BEGIN
  SELECT * INTO _a FROM public.hospital_inpatient_admissions WHERE id = NEW.admission_id;
  SELECT name INTO _from FROM public.hospital_wards WHERE id = NEW.from_ward_id;
  SELECT name INTO _to FROM public.hospital_wards WHERE id = NEW.to_ward_id;

  INSERT INTO public.patient_activity_logs(patient_id, patient_user_id, admission_id, hospital_id, ward_id, action_type, details, staff_user_id, staff_name, staff_role)
  VALUES (_a.patient_id, _a.patient_user_id, NEW.admission_id, _a.hospital_id, NEW.to_ward_id, 'ward_transfer',
          'Transferred from ' || COALESCE(_from,'—') || COALESCE(' bed ' || NEW.from_bed_number,'') ||
          ' to ' || COALESCE(_to,'—') || COALESCE(' bed ' || NEW.to_bed_number,'') ||
          COALESCE(' — ' || NEW.reason, ''),
          NEW.moved_by, COALESCE(NEW.moved_by_name,'Hospital staff'), 'hospital_staff');
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_ward_transfer
  AFTER INSERT ON public.hospital_ward_transfers
  FOR EACH ROW EXECUTE FUNCTION public.log_ward_transfer_activity();

CREATE OR REPLACE FUNCTION public.log_attending_doctor_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.hospital_inpatient_admissions;
BEGIN
  SELECT * INTO _a FROM public.hospital_inpatient_admissions WHERE id = NEW.admission_id;
  INSERT INTO public.patient_activity_logs(patient_id, patient_user_id, admission_id, hospital_id, ward_id, action_type, details, staff_user_id, staff_name, staff_role)
  VALUES (_a.patient_id, _a.patient_user_id, NEW.admission_id, _a.hospital_id, _a.ward_id, 'doctor_assignment',
          NEW.doctor_name || ' assigned as ' || CASE WHEN NEW.is_primary THEN 'primary attending' ELSE 'consulting doctor' END,
          auth.uid(), NEW.doctor_name, 'doctor');
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_attending_doctor
  AFTER INSERT ON public.hospital_attending_doctors
  FOR EACH ROW EXECUTE FUNCTION public.log_attending_doctor_activity();

CREATE OR REPLACE FUNCTION public.log_nurse_assignment_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.hospital_inpatient_admissions; _tasks text;
BEGIN
  SELECT * INTO _a FROM public.hospital_inpatient_admissions WHERE id = NEW.admission_id;
  SELECT string_agg(value::text, ', ') INTO _tasks FROM jsonb_array_elements_text(NEW.care_tasks) AS value;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.patient_activity_logs(patient_id, patient_user_id, admission_id, hospital_id, ward_id, action_type, details, staff_user_id, staff_name, staff_role)
    VALUES (_a.patient_id, _a.patient_user_id, NEW.admission_id, _a.hospital_id, _a.ward_id, 'nurse_assignment',
            NEW.nurse_name || ' assigned as ' || NEW.care_role || ' nurse' || COALESCE(' — ' || _tasks, ''),
            auth.uid(), NEW.nurse_name, 'nurse');
  ELSIF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL THEN
    INSERT INTO public.patient_activity_logs(patient_id, patient_user_id, admission_id, hospital_id, ward_id, action_type, details, staff_user_id, staff_name, staff_role)
    VALUES (_a.patient_id, _a.patient_user_id, NEW.admission_id, _a.hospital_id, _a.ward_id, 'nurse_assignment',
            NEW.nurse_name || ' released from this patient''s care',
            auth.uid(), NEW.nurse_name, 'nurse');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_nurse_assignment
  AFTER INSERT OR UPDATE ON public.hospital_nurse_assignments
  FOR EACH ROW EXECUTE FUNCTION public.log_nurse_assignment_activity();

-- Clock in / out logged against every patient the staff member attends
CREATE OR REPLACE FUNCTION public.log_shift_clock_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rec record; _event text;
BEGIN
  IF NEW.clocked_in_at IS NOT NULL AND OLD.clocked_in_at IS NULL THEN
    _event := 'clocked in';
  ELSIF NEW.clocked_out_at IS NOT NULL AND OLD.clocked_out_at IS NULL THEN
    _event := 'clocked out';
  ELSE
    RETURN NEW;
  END IF;

  FOR _rec IN
    SELECT a.patient_id, a.patient_user_id, a.id AS admission_id, a.hospital_id, a.ward_id
    FROM public.hospital_nurse_assignments na
    JOIN public.hospital_inpatient_admissions a ON a.id = na.admission_id
    WHERE na.shift_id = NEW.id AND na.released_at IS NULL
  LOOP
    INSERT INTO public.patient_activity_logs(patient_id, patient_user_id, admission_id, hospital_id, ward_id, action_type, details, staff_user_id, staff_name, staff_role)
    VALUES (_rec.patient_id, _rec.patient_user_id, _rec.admission_id, _rec.hospital_id, _rec.ward_id, 'shift_change',
            NEW.staff_name || ' ' || _event || ' (' || NEW.shift_type || ' shift)',
            NEW.doctor_id, NEW.staff_name, NEW.staff_role);
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_shift_clock
  AFTER UPDATE ON public.hospital_staff_shifts
  FOR EACH ROW EXECUTE FUNCTION public.log_shift_clock_activity();

-- Ambulance drop-off at hospital → patient activity log
CREATE OR REPLACE FUNCTION public.log_ambulance_dropoff_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _patient_id uuid;
BEGIN
  IF NEW.status = 'at_hospital' AND OLD.status IS DISTINCT FROM 'at_hospital' AND NEW.destination_hospital_id IS NOT NULL THEN
    SELECT id INTO _patient_id FROM public.patients
      WHERE patient_user_id = NEW.user_id ORDER BY created_at LIMIT 1;
    INSERT INTO public.patient_activity_logs(patient_id, patient_user_id, hospital_id, action_type, details, staff_name, staff_role, occurred_at)
    VALUES (_patient_id, NEW.user_id, NEW.destination_hospital_id, 'ambulance_dropoff',
            'Ambulance drop-off at ER (incident ' || COALESCE(NEW.incident_number, left(NEW.id::text,8)) || ')',
            'Ambulance crew', 'paramedic', now());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_ambulance_dropoff
  AFTER UPDATE ON public.holarchelp_incidents
  FOR EACH ROW EXECUTE FUNCTION public.log_ambulance_dropoff_activity();

-- ===== CLOCK IN / OUT RPC =====
CREATE OR REPLACE FUNCTION public.hospital_shift_clock(_shift_id uuid, _action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s public.hospital_staff_shifts;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _s FROM public.hospital_staff_shifts WHERE id = _shift_id;
  IF _s.id IS NULL THEN RAISE EXCEPTION 'Shift not found'; END IF;

  IF NOT (
    _s.doctor_id = _uid
    OR EXISTS (SELECT 1 FROM public.hospital_nurses n WHERE n.id = _s.nurse_id AND n.linked_user_id = _uid)
    OR public.is_hospital_admin(_s.hospital_id, _uid)
    OR public.has_role(_uid, 'admin'::user_role)
  ) THEN
    RAISE EXCEPTION 'Not authorised for this shift';
  END IF;

  IF _action = 'in' THEN
    IF _s.clocked_in_at IS NOT NULL THEN RAISE EXCEPTION 'Already clocked in'; END IF;
    IF EXISTS (
      SELECT 1 FROM public.hospital_staff_shifts o
      WHERE o.id <> _shift_id AND o.clocked_in_at IS NOT NULL AND o.clocked_out_at IS NULL
        AND ((o.doctor_id IS NOT NULL AND o.doctor_id = _s.doctor_id) OR (o.nurse_id IS NOT NULL AND o.nurse_id = _s.nurse_id))
    ) THEN
      RAISE EXCEPTION 'This staff member is already clocked in on another shift';
    END IF;
    UPDATE public.hospital_staff_shifts
      SET clocked_in_at = now(), status = 'on_shift' WHERE id = _shift_id;
  ELSIF _action = 'out' THEN
    IF _s.clocked_in_at IS NULL THEN RAISE EXCEPTION 'Not clocked in'; END IF;
    UPDATE public.hospital_staff_shifts
      SET clocked_out_at = now(), status = 'completed' WHERE id = _shift_id;
  ELSE
    RAISE EXCEPTION 'Invalid action %', _action;
  END IF;

  RETURN jsonb_build_object('ok', true, 'shift_id', _shift_id, 'action', _action);
END $$;

-- ===== TRANSFER RPC (moves patient + records history) =====
CREATE OR REPLACE FUNCTION public.hospital_transfer_patient(_admission_id uuid, _to_ward_id uuid, _to_bed text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _a public.hospital_inpatient_admissions; _name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _a FROM public.hospital_inpatient_admissions WHERE id = _admission_id;
  IF _a.id IS NULL THEN RAISE EXCEPTION 'Admission not found'; END IF;
  IF NOT (public.is_hospital_staff(_a.hospital_id, _uid) OR public.has_role(_uid,'admin'::user_role)) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT full_name INTO _name FROM public.profiles WHERE id = _uid;

  INSERT INTO public.hospital_ward_transfers(admission_id, from_ward_id, to_ward_id, from_bed_number, to_bed_number, reason, moved_by, moved_by_name)
  VALUES (_admission_id, _a.ward_id, _to_ward_id, _a.bed_number, _to_bed, _reason, _uid, COALESCE(_name,'Hospital staff'));

  UPDATE public.hospital_inpatient_admissions
    SET ward_id = _to_ward_id, bed_number = _to_bed
    WHERE id = _admission_id;

  RETURN jsonb_build_object('ok', true);
END $$;
