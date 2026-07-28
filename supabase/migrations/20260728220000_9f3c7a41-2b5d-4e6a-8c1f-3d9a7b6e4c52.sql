-- Admission screen redesign: doctor on call, nurse shifts, meal/diet log,
-- hospital-level visiting hours, and shared access for the patient, admitting
-- doctor, doctor on call, all doctors in the patient's holarchy, and hospital staff.

-- 1. Hospital-level default visiting hours
ALTER TABLE public.holarchelp_hospitals
  ADD COLUMN IF NOT EXISTS visiting_hours text;

-- 2. New admission-level fields
ALTER TABLE public.hospital_admissions
  ADD COLUMN IF NOT EXISTS doctor_on_call_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS patient_care_notes text,
  ADD COLUMN IF NOT EXISTS visiting_hours_override text,
  ADD COLUMN IF NOT EXISTS diet_type text;

-- 3. Nurse shift assignments — the row history IS the handover log
CREATE TABLE IF NOT EXISTS public.admission_nurse_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  nurse_user_id uuid REFERENCES auth.users(id),
  nurse_name_snapshot text NOT NULL,
  shift_start timestamptz NOT NULL DEFAULT now(),
  shift_end timestamptz,
  handover_notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admission_nurse_shifts_admission ON public.admission_nurse_shifts(admission_id, shift_start DESC);

-- 4. Meal / diet log
CREATE TABLE IF NOT EXISTS public.admission_meal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  meal_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_slot text NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  ate boolean,
  notes text,
  logged_by uuid NOT NULL,
  nurse_name_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admission_meal_log_admission ON public.admission_meal_log(admission_id, meal_date DESC);

ALTER TABLE public.admission_nurse_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_meal_log ENABLE ROW LEVEL SECURITY;

-- 5. Shared access helper: patient, admitting doctor, doctor on call, any
-- doctor with an active holarchy grant for the patient, or staff at the
-- admitting hospital.
CREATE OR REPLACE FUNCTION public.can_view_admission(_admission_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hospital_admissions ha
    JOIN public.patients p ON p.id = ha.patient_id
    WHERE ha.id = _admission_id
      AND (
        p.patient_user_id = auth.uid()
        OR p.user_id = auth.uid()
        OR ha.doctor_id = auth.uid()
        OR ha.doctor_on_call_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.doctor_patient_access dpa
          WHERE dpa.patient_user_id = p.patient_user_id
            AND dpa.doctor_id = auth.uid()
            AND dpa.is_active = true
        )
        OR (
          ha.hospital_provider_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.holarchelp_hospital_members m
            WHERE m.hospital_id = ha.hospital_provider_id
              AND m.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- 6. Staff-only helper for INSERT/UPDATE on shift and meal logs
CREATE OR REPLACE FUNCTION public.is_hospital_staff_for_admission(_admission_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hospital_admissions ha
    JOIN public.holarchelp_hospital_members m ON m.hospital_id = ha.hospital_provider_id
    WHERE ha.id = _admission_id
      AND m.user_id = auth.uid()
  );
$$;

-- 7. Extend hospital_admissions visibility (additive — existing SELECT
-- policies still apply) to cover doctor on call + holarchy doctors + hospital staff.
CREATE POLICY "Shared admission access can view admissions"
ON public.hospital_admissions
FOR SELECT
USING (public.can_view_admission(id));

-- 8. Nurse shifts policies
CREATE POLICY "Admission-accessible users can view nurse shifts"
ON public.admission_nurse_shifts
FOR SELECT
USING (public.can_view_admission(admission_id));

CREATE POLICY "Hospital staff can log nurse shifts"
ON public.admission_nurse_shifts
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND public.is_hospital_staff_for_admission(admission_id)
);

CREATE POLICY "Hospital staff can update nurse shifts"
ON public.admission_nurse_shifts
FOR UPDATE
USING (public.is_hospital_staff_for_admission(admission_id));

-- 9. Meal log policies
CREATE POLICY "Admission-accessible users can view meal log"
ON public.admission_meal_log
FOR SELECT
USING (public.can_view_admission(admission_id));

CREATE POLICY "Hospital staff can log meals"
ON public.admission_meal_log
FOR INSERT
WITH CHECK (
  auth.uid() = logged_by
  AND public.is_hospital_staff_for_admission(admission_id)
);

CREATE POLICY "Hospital staff can update meal log"
ON public.admission_meal_log
FOR UPDATE
USING (public.is_hospital_staff_for_admission(admission_id));

-- 10. Allow the client to call these directly (e.g. to gate edit UI)
REVOKE EXECUTE ON FUNCTION public.can_view_admission(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_hospital_staff_for_admission(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_admission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hospital_staff_for_admission(uuid) TO authenticated;
