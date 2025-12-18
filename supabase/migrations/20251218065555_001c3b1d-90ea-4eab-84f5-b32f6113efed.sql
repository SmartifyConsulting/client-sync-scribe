-- Create table for patient rewards/lollipops
CREATE TABLE public.patient_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL DEFAULT 'lollipop',
  visit_category TEXT NOT NULL,
  awarded_by UUID NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_rewards ENABLE ROW LEVEL SECURITY;

-- Doctors can view rewards for their patients
CREATE POLICY "Doctors can view rewards for their patients"
ON public.patient_rewards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_rewards.patient_id
    AND p.user_id = auth.uid()
  )
);

-- Doctors can create rewards for their patients
CREATE POLICY "Doctors can create rewards"
ON public.patient_rewards
FOR INSERT
WITH CHECK (
  auth.uid() = awarded_by AND
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_rewards.patient_id
    AND p.user_id = auth.uid()
  )
);

-- Patients can view their own rewards
CREATE POLICY "Patients can view their own rewards"
ON public.patient_rewards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_rewards.patient_id
    AND p.patient_user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_patient_rewards_patient_id ON public.patient_rewards(patient_id);
CREATE INDEX idx_patient_rewards_session_id ON public.patient_rewards(session_id);