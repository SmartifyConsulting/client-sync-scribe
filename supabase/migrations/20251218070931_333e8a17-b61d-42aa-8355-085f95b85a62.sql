-- Create streak_config table for admin-configurable streak rewards
CREATE TABLE public.streak_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  streak_name text NOT NULL UNIQUE,
  visit_category text NOT NULL,
  streak_interval_months integer NOT NULL DEFAULT 12,
  lollipops_awarded integer NOT NULL DEFAULT 3,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.streak_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for streak_config (admin-only write, public read)
CREATE POLICY "Anyone can view streak config"
  ON public.streak_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert streak config"
  ON public.streak_config FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update streak config"
  ON public.streak_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete streak config"
  ON public.streak_config FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create patient_streaks table to track streak progress
CREATE TABLE public.patient_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  streak_config_id uuid NOT NULL REFERENCES public.streak_config(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_completed_at timestamp with time zone,
  next_due_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(patient_id, streak_config_id)
);

-- Enable RLS
ALTER TABLE public.patient_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies for patient_streaks
CREATE POLICY "Doctors can view streaks for their patients"
  ON public.patient_streaks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients p WHERE p.id = patient_streaks.patient_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Patients can view their own streaks"
  ON public.patient_streaks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients p WHERE p.id = patient_streaks.patient_id AND p.patient_user_id = auth.uid()
  ));

CREATE POLICY "System can manage streaks"
  ON public.patient_streaks FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed default streak configurations
INSERT INTO public.streak_config (streak_name, visit_category, streak_interval_months, lollipops_awarded, description) VALUES
  ('Annual Mammogram', 'Mammogram', 12, 5, 'Complete annual mammogram screening'),
  ('Annual Eye Exam', 'Optometrist', 12, 3, 'Complete annual eye examination'),
  ('Quarterly Vitals Check', 'Vital Signs Check', 3, 2, 'Regular vital signs monitoring'),
  ('Annual Pap Smear', 'Pap Smear', 12, 5, 'Annual cervical cancer screening'),
  ('Annual HIV Test', 'HIV Test', 12, 3, 'Annual HIV screening'),
  ('Annual Cholesterol Check', 'Cholesterol Test', 12, 3, 'Annual cholesterol screening');