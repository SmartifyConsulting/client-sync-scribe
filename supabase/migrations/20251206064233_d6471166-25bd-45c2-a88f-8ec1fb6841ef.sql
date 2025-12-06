-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('doctor', 'patient');

-- Create enum for invitation status
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Create enum for access permission types
CREATE TYPE public.access_permission AS ENUM ('patient_info', 'calendar', 'session_summaries', 'prescription_history');

-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role public.user_role DEFAULT NULL;

-- Add allergies column to patients table
ALTER TABLE public.patients ADD COLUMN allergies text DEFAULT NULL;

-- Create user_roles table for role-based access (security best practice)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.user_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create patient_invitations table
CREATE TABLE public.patient_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_email text NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create doctor_access_requests table (for patients inviting doctors)
CREATE TABLE public.doctor_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  doctor_practice_number text NOT NULL,
  doctor_registration_number text NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create doctor_patient_access table (granted permissions)
CREATE TABLE public.doctor_patient_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_user_id uuid NOT NULL,
  permissions public.access_permission[] NOT NULL DEFAULT '{}',
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, patient_user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patient_access ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policies for patient_invitations
CREATE POLICY "Doctors can view their sent invitations"
ON public.patient_invitations FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create invitations"
ON public.patient_invitations FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their invitations"
ON public.patient_invitations FOR UPDATE
USING (auth.uid() = doctor_id);

-- RLS policies for doctor_access_requests
CREATE POLICY "Patients can view their access requests"
ON public.doctor_access_requests FOR SELECT
USING (auth.uid() = patient_user_id);

CREATE POLICY "Patients can create access requests"
ON public.doctor_access_requests FOR INSERT
WITH CHECK (auth.uid() = patient_user_id);

CREATE POLICY "Patients can update their access requests"
ON public.doctor_access_requests FOR UPDATE
USING (auth.uid() = patient_user_id);

CREATE POLICY "Doctors can view requests for them"
ON public.doctor_access_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND practice_number = doctor_access_requests.doctor_practice_number
    AND doctor_number = doctor_access_requests.doctor_registration_number
  )
);

CREATE POLICY "Doctors can update requests for them"
ON public.doctor_access_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND practice_number = doctor_access_requests.doctor_practice_number
    AND doctor_number = doctor_access_requests.doctor_registration_number
  )
);

-- RLS policies for doctor_patient_access
CREATE POLICY "Doctors can view their granted access"
ON public.doctor_patient_access FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can view who has access"
ON public.doctor_patient_access FOR SELECT
USING (auth.uid() = patient_user_id);

CREATE POLICY "Patients can grant access"
ON public.doctor_patient_access FOR INSERT
WITH CHECK (auth.uid() = patient_user_id);

CREATE POLICY "Patients can update access"
ON public.doctor_patient_access FOR UPDATE
USING (auth.uid() = patient_user_id);

CREATE POLICY "Patients can revoke access"
ON public.doctor_patient_access FOR DELETE
USING (auth.uid() = patient_user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_patient_invitations_updated_at
BEFORE UPDATE ON public.patient_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_access_requests_updated_at
BEFORE UPDATE ON public.doctor_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_patient_access_updated_at
BEFORE UPDATE ON public.doctor_patient_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();