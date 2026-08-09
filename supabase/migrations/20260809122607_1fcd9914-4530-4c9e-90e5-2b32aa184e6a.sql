-- Helper: who may manage a patient's programmes
CREATE OR REPLACE FUNCTION public.can_manage_patient_programme(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = _patient_id
      AND (
        p.patient_user_id = auth.uid()
        OR p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.doctor_patient_access dpa
          WHERE dpa.patient_user_id = p.patient_user_id
            AND dpa.doctor_id = auth.uid()
            AND dpa.is_active = true
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_patient_programme(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_patient_programme(_patient_id)
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ MEAL PLANS ============
CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL DEFAULT 'Eating Plan',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team can manage meal plans" ON public.meal_plans
  FOR ALL TO authenticated
  USING (public.can_manage_patient_programme(patient_id))
  WITH CHECK (public.can_manage_patient_programme(patient_id));
CREATE TRIGGER meal_plans_updated_at BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.meal_plan_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  food_group text NOT NULL CHECK (food_group IN ('protein','carbohydrate','vegetable','fat')),
  name text NOT NULL,
  grams numeric NOT NULL DEFAULT 100,
  energy_kj numeric,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_foods TO authenticated;
GRANT ALL ON public.meal_plan_foods TO service_role;
ALTER TABLE public.meal_plan_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team can manage meal plan foods" ON public.meal_plan_foods
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.can_manage_patient_programme(mp.patient_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.can_manage_patient_programme(mp.patient_id)));
CREATE TRIGGER meal_plan_foods_updated_at BEFORE UPDATE ON public.meal_plan_foods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.meal_plan_slot_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  slot_key text NOT NULL,
  instruction_kind text NOT NULL DEFAULT 'free' CHECK (instruction_kind IN ('choose_one','energy_target','free')),
  instruction_text text,
  target_energy numeric,
  energy_unit text NOT NULL DEFAULT 'kJ' CHECK (energy_unit IN ('kJ','kcal')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, slot_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_slot_instructions TO authenticated;
GRANT ALL ON public.meal_plan_slot_instructions TO service_role;
ALTER TABLE public.meal_plan_slot_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team can manage slot instructions" ON public.meal_plan_slot_instructions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.can_manage_patient_programme(mp.patient_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.can_manage_patient_programme(mp.patient_id)));
CREATE TRIGGER meal_plan_slot_instructions_updated_at BEFORE UPDATE ON public.meal_plan_slot_instructions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.meal_plan_slot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_key text NOT NULL,
  food_id uuid REFERENCES public.meal_plan_foods(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  food_group text NOT NULL,
  grams numeric NOT NULL DEFAULT 100,
  unit_multiplier numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_slot_items TO authenticated;
GRANT ALL ON public.meal_plan_slot_items TO service_role;
ALTER TABLE public.meal_plan_slot_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team can manage slot items" ON public.meal_plan_slot_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.can_manage_patient_programme(mp.patient_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.can_manage_patient_programme(mp.patient_id)));
CREATE TRIGGER meal_plan_slot_items_updated_at BEFORE UPDATE ON public.meal_plan_slot_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EXERCISE PLANS ============
CREATE TABLE public.exercise_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL DEFAULT 'Exercise Programme',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_plans TO authenticated;
GRANT ALL ON public.exercise_plans TO service_role;
ALTER TABLE public.exercise_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team can manage exercise plans" ON public.exercise_plans
  FOR ALL TO authenticated
  USING (public.can_manage_patient_programme(patient_id))
  WITH CHECK (public.can_manage_patient_programme(patient_id));
CREATE TRIGGER exercise_plans_updated_at BEFORE UPDATE ON public.exercise_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.exercise_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.exercise_plans(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_plan_days TO authenticated;
GRANT ALL ON public.exercise_plan_days TO service_role;
ALTER TABLE public.exercise_plan_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team can manage exercise plan days" ON public.exercise_plan_days
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exercise_plans ep WHERE ep.id = plan_id AND public.can_manage_patient_programme(ep.patient_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exercise_plans ep WHERE ep.id = plan_id AND public.can_manage_patient_programme(ep.patient_id)));
CREATE TRIGGER exercise_plan_days_updated_at BEFORE UPDATE ON public.exercise_plan_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ADHERENCE ============
CREATE TABLE public.programme_adherence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  kind text NOT NULL CHECK (kind IN ('meal','exercise')),
  slot_key text NOT NULL DEFAULT 'day',
  completed boolean NOT NULL DEFAULT true,
  vulas_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, entry_date, kind, slot_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programme_adherence TO authenticated;
GRANT ALL ON public.programme_adherence TO service_role;
ALTER TABLE public.programme_adherence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team can view adherence" ON public.programme_adherence
  FOR SELECT TO authenticated
  USING (public.can_manage_patient_programme(patient_id));
CREATE POLICY "Care team can record adherence" ON public.programme_adherence
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_patient_programme(patient_id));
CREATE POLICY "Care team can update adherence" ON public.programme_adherence
  FOR UPDATE TO authenticated
  USING (public.can_manage_patient_programme(patient_id))
  WITH CHECK (public.can_manage_patient_programme(patient_id));
CREATE POLICY "Care team can delete adherence" ON public.programme_adherence
  FOR DELETE TO authenticated
  USING (public.can_manage_patient_programme(patient_id));
CREATE TRIGGER programme_adherence_updated_at BEFORE UPDATE ON public.programme_adherence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ WEIGH-INS ============
CREATE TABLE public.patient_weigh_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL,
  weight_kg numeric NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  previous_weight_kg numeric,
  kg_lost numeric NOT NULL DEFAULT 0,
  vulas_awarded integer NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_weigh_ins TO authenticated;
GRANT ALL ON public.patient_weigh_ins TO service_role;
ALTER TABLE public.patient_weigh_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team can view weigh-ins" ON public.patient_weigh_ins
  FOR SELECT TO authenticated
  USING (public.can_manage_patient_programme(patient_id));
CREATE POLICY "Doctors can record weigh-ins" ON public.patient_weigh_ins
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_patient_programme(patient_id) AND recorded_by = auth.uid());
CREATE POLICY "Recorder can update weigh-ins" ON public.patient_weigh_ins
  FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid())
  WITH CHECK (recorded_by = auth.uid());
CREATE TRIGGER patient_weigh_ins_updated_at BEFORE UPDATE ON public.patient_weigh_ins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();