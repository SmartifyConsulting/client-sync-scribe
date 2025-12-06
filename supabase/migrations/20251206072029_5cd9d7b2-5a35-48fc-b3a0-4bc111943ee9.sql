-- Create messages table for doctor-to-doctor communication about patients
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Doctors can view messages they sent"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id);

CREATE POLICY "Doctors can view messages they received"
ON public.messages
FOR SELECT
USING (auth.uid() = recipient_id);

CREATE POLICY "Doctors can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update their messages (mark as read)"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id);

CREATE POLICY "Senders can delete their messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Create trigger for updated_at
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster inbox queries
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_messages_patient ON public.messages(patient_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);