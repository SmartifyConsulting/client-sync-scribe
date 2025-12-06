-- Add patient_user_id to patients table to link patient users to their records
ALTER TABLE public.patients ADD COLUMN patient_user_id uuid REFERENCES auth.users(id) DEFAULT NULL;

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  medication text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  instructions text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  refills_remaining integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date date NOT NULL,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for prescriptions
-- Doctors can manage prescriptions they created
CREATE POLICY "Doctors can view their prescriptions"
ON public.prescriptions FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their prescriptions"
ON public.prescriptions FOR UPDATE
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their prescriptions"
ON public.prescriptions FOR DELETE
USING (auth.uid() = doctor_id);

-- Patients can view their own prescriptions
CREATE POLICY "Patients can view their prescriptions"
ON public.prescriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescriptions.patient_id
    AND p.patient_user_id = auth.uid()
  )
);

-- RLS policies for invoices
-- Doctors can manage invoices they created
CREATE POLICY "Doctors can view their invoices"
ON public.invoices FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create invoices"
ON public.invoices FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their invoices"
ON public.invoices FOR UPDATE
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their invoices"
ON public.invoices FOR DELETE
USING (auth.uid() = doctor_id);

-- Patients can view their own invoices
CREATE POLICY "Patients can view their invoices"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = invoices.patient_id
    AND p.patient_user_id = auth.uid()
  )
);

-- Add RLS policy for patients to view their own appointments
CREATE POLICY "Patients can view their appointments"
ON public.appointments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointments.patient_id
    AND p.patient_user_id = auth.uid()
  )
);

-- Add RLS policy for patients to view their patient record
CREATE POLICY "Patients can view their own patient record"
ON public.patients FOR SELECT
USING (patient_user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_patients_patient_user_id ON public.patients(patient_user_id);
CREATE INDEX idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX idx_invoices_doctor_id ON public.invoices(doctor_id);