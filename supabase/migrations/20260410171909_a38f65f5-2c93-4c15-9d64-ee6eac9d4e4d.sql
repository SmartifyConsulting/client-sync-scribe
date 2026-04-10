
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS ice_contacts jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS next_of_kin_members jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS current_medications jsonb DEFAULT '[]'::jsonb;
