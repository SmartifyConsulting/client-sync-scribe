-- Create appointment_requests table
CREATE TABLE public.appointment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.service_prices(id),
  requested_start timestamp with time zone NOT NULL,
  requested_end timestamp with time zone NOT NULL,
  proposed_start timestamp with time zone,
  proposed_end timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;

-- Patients can insert their own requests
CREATE POLICY "Patients can insert appointment requests"
ON public.appointment_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = patient_user_id);

-- Patients can view their own requests
CREATE POLICY "Patients can view their appointment requests"
ON public.appointment_requests FOR SELECT TO authenticated
USING (auth.uid() = patient_user_id);

-- Doctors can view requests sent to them
CREATE POLICY "Doctors can view appointment requests for them"
ON public.appointment_requests FOR SELECT TO authenticated
USING (auth.uid() = doctor_id);

-- Patients can update their own requests (confirm/decline proposed)
CREATE POLICY "Patients can update their appointment requests"
ON public.appointment_requests FOR UPDATE TO authenticated
USING (auth.uid() = patient_user_id);

-- Doctors can update requests sent to them (accept/propose/decline)
CREATE POLICY "Doctors can update appointment requests"
ON public.appointment_requests FOR UPDATE TO authenticated
USING (auth.uid() = doctor_id);

-- Allow patients to view doctor's service prices (needed for booking)
CREATE POLICY "Patients can view connected doctor service prices"
ON public.service_prices FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access dpa
    WHERE dpa.doctor_id = service_prices.user_id
      AND dpa.patient_user_id = auth.uid()
      AND dpa.is_active = true
  )
);

-- Allow patients to view connected doctor appointments (for slot availability)
CREATE POLICY "Patients can view connected doctor appointments for booking"
ON public.appointments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access dpa
    WHERE dpa.doctor_id = appointments.user_id
      AND dpa.patient_user_id = auth.uid()
      AND dpa.is_active = true
  )
);

-- Allow patients to view connected doctor profiles (name, specialty)
CREATE POLICY "Patients can view connected doctor profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access dpa
    WHERE dpa.doctor_id = profiles.id
      AND dpa.patient_user_id = auth.uid()
      AND dpa.is_active = true
  )
);

-- Validation trigger: ensure times are between 7:00 and 18:00
CREATE OR REPLACE FUNCTION public.validate_appointment_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Check requested times
  IF EXTRACT(HOUR FROM NEW.requested_start AT TIME ZONE 'UTC') < 7
     OR EXTRACT(HOUR FROM NEW.requested_end AT TIME ZONE 'UTC') > 18
     OR (EXTRACT(HOUR FROM NEW.requested_end AT TIME ZONE 'UTC') = 18 AND EXTRACT(MINUTE FROM NEW.requested_end AT TIME ZONE 'UTC') > 0) THEN
    RAISE EXCEPTION 'Appointments must be between 7:00 AM and 6:00 PM';
  END IF;

  -- Check proposed times if set
  IF NEW.proposed_start IS NOT NULL THEN
    IF EXTRACT(HOUR FROM NEW.proposed_start AT TIME ZONE 'UTC') < 7
       OR EXTRACT(HOUR FROM NEW.proposed_end AT TIME ZONE 'UTC') > 18
       OR (EXTRACT(HOUR FROM NEW.proposed_end AT TIME ZONE 'UTC') = 18 AND EXTRACT(MINUTE FROM NEW.proposed_end AT TIME ZONE 'UTC') > 0) THEN
      RAISE EXCEPTION 'Proposed times must be between 7:00 AM and 6:00 PM';
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_appointment_request_time
BEFORE INSERT OR UPDATE ON public.appointment_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_time();

-- Enable realtime for appointment_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_requests;