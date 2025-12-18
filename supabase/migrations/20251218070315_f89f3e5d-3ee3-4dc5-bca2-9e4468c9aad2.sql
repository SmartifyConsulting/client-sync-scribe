-- Create gamification config table for admin-configurable rewards
CREATE TABLE public.gamification_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_category TEXT NOT NULL UNIQUE,
  lollipops_awarded INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gamification_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read gamification config
CREATE POLICY "Anyone can view gamification config"
ON public.gamification_config
FOR SELECT
USING (true);

-- Only admins can modify gamification config
CREATE POLICY "Admins can insert gamification config"
ON public.gamification_config
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gamification config"
ON public.gamification_config
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gamification config"
ON public.gamification_config
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add lollipops_count column to patient_rewards for variable amounts
ALTER TABLE public.patient_rewards ADD COLUMN lollipops_count INTEGER NOT NULL DEFAULT 1;

-- Seed default gamification config
INSERT INTO public.gamification_config (visit_category, lollipops_awarded, description) VALUES
('Signup Bonus', 1, 'Welcome reward for signing up'),
('GP Visit', 1, 'General practitioner visit'),
('Optometrist', 1, 'Eye examination'),
('Vital Signs Check', 1, 'Blood pressure, heart rate check'),
('Cholesterol Test', 2, 'Cholesterol screening'),
('Blood Sugar Test', 2, 'Diabetes screening'),
('HIV Test', 2, 'HIV screening'),
('Pap Smear', 2, 'Cervical cancer screening'),
('Mammogram', 2, 'Breast cancer screening'),
('Prostate Exam', 2, 'Prostate cancer screening'),
('Vaccination', 1, 'Immunization'),
('Annual Physical', 2, 'Comprehensive wellness check'),
('Health Screening', 1, 'General preventative screening');

-- Create trigger for updated_at
CREATE TRIGGER update_gamification_config_updated_at
BEFORE UPDATE ON public.gamification_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();