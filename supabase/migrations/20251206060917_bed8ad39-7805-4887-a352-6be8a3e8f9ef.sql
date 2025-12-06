-- Add address field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS practice_address text;

-- Create partners table for practice partners
CREATE TABLE public.practice_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  registration_number text NOT NULL,
  mobile_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practice_partners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own partners" 
ON public.practice_partners 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partners" 
ON public.practice_partners 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partners" 
ON public.practice_partners 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own partners" 
ON public.practice_partners 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_practice_partners_updated_at
BEFORE UPDATE ON public.practice_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();