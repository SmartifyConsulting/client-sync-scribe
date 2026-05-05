ALTER TABLE public.prescriptions
ADD COLUMN IF NOT EXISTS quantity_per_dose integer NOT NULL DEFAULT 1;