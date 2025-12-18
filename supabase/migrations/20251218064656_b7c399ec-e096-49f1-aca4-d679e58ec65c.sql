-- Add height, weight, and surgeries columns to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS height_cm numeric NULL,
ADD COLUMN IF NOT EXISTS weight_kg numeric NULL,
ADD COLUMN IF NOT EXISTS surgeries jsonb NULL DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.patients.surgeries IS 'Array of surgery objects: [{name: string, date: string, notes?: string}]';