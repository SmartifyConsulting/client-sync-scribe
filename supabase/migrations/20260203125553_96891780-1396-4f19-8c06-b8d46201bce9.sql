-- Create session_drawings table for storing drawing pad data
CREATE TABLE public.session_drawings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  canvas_data jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_session_drawings_session_id ON public.session_drawings(session_id);
CREATE INDEX idx_session_drawings_patient_id ON public.session_drawings(patient_id);
CREATE INDEX idx_session_drawings_patient_version ON public.session_drawings(patient_id, version);

-- Enable RLS
ALTER TABLE public.session_drawings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Doctors can view their own drawings"
ON public.session_drawings
FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create drawings"
ON public.session_drawings
FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their own drawings"
ON public.session_drawings
FOR UPDATE
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their own drawings"
ON public.session_drawings
FOR DELETE
USING (auth.uid() = doctor_id);

-- Trigger for updated_at
CREATE TRIGGER update_session_drawings_updated_at
BEFORE UPDATE ON public.session_drawings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();