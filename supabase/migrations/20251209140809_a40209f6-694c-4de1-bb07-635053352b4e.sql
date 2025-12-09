-- Create round table notes table for collective doctor notes
CREATE TABLE public.round_table_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  doctor_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track which doctors have read which notes
CREATE TABLE public.round_table_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.round_table_notes(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(note_id, doctor_id)
);

-- Enable RLS on both tables
ALTER TABLE public.round_table_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_table_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies for round_table_notes
-- Doctors can view notes for patients they have access to (either as owner or granted access)
CREATE POLICY "Doctors can view round table notes for their patients"
ON public.round_table_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = round_table_notes.patient_id 
    AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM patients p
    JOIN doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
    WHERE p.id = round_table_notes.patient_id
    AND dpa.doctor_id = auth.uid()
    AND dpa.is_active = true
  )
);

-- Doctors can create notes for patients they have access to
CREATE POLICY "Doctors can create round table notes"
ON public.round_table_notes
FOR INSERT
WITH CHECK (
  auth.uid() = doctor_id
  AND (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = round_table_notes.patient_id 
      AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM patients p
      JOIN doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
      WHERE p.id = round_table_notes.patient_id
      AND dpa.doctor_id = auth.uid()
      AND dpa.is_active = true
    )
  )
);

-- Doctors can update their own notes
CREATE POLICY "Doctors can update their own round table notes"
ON public.round_table_notes
FOR UPDATE
USING (auth.uid() = doctor_id);

-- Doctors can delete their own notes
CREATE POLICY "Doctors can delete their own round table notes"
ON public.round_table_notes
FOR DELETE
USING (auth.uid() = doctor_id);

-- RLS policies for round_table_reads
CREATE POLICY "Doctors can view their own read status"
ON public.round_table_reads
FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can mark notes as read"
ON public.round_table_reads
FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their read status"
ON public.round_table_reads
FOR UPDATE
USING (auth.uid() = doctor_id);

-- Create trigger for updated_at
CREATE TRIGGER update_round_table_notes_updated_at
BEFORE UPDATE ON public.round_table_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();