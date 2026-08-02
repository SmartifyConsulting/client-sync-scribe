ALTER TABLE public.holarchelp_hospitals
  ADD COLUMN IF NOT EXISTS has_emergency_department boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepts_ambulance_transfers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS operates_own_ambulance_fleet boolean NOT NULL DEFAULT false;

ALTER TABLE public.holarchelp_incidents
  ADD COLUMN IF NOT EXISTS assigned_trauma_bay text,
  ADD COLUMN IF NOT EXISTS assigned_doctor_user_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_doctor_name text,
  ADD COLUMN IF NOT EXISTS hospital_acceptance_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS hospital_accepted_by uuid,
  ADD COLUMN IF NOT EXISTS hospital_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS trauma_team_prepared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handover_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS handover_at timestamptz,
  ADD COLUMN IF NOT EXISTS handover_notes text;

ALTER TABLE public.holarchelp_incidents
  DROP CONSTRAINT IF EXISTS holarchelp_incidents_hospital_acceptance_status_check;
ALTER TABLE public.holarchelp_incidents
  ADD CONSTRAINT holarchelp_incidents_hospital_acceptance_status_check
  CHECK (hospital_acceptance_status IN ('pending','accepted','redirected','declined'));

ALTER TABLE public.holarchelp_incidents
  DROP CONSTRAINT IF EXISTS holarchelp_incidents_handover_status_check;
ALTER TABLE public.holarchelp_incidents
  ADD CONSTRAINT holarchelp_incidents_handover_status_check
  CHECK (handover_status IN ('pending','in_progress','completed'));

CREATE INDEX IF NOT EXISTS idx_holarchelp_incidents_destination_hospital
  ON public.holarchelp_incidents (destination_hospital_id, status);