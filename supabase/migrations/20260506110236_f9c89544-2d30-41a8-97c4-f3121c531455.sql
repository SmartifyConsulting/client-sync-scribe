ALTER TABLE public.holarchelp_hospitals
  ADD COLUMN IF NOT EXISTS ownership text NOT NULL DEFAULT 'private';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'holarchelp_hospitals_ownership_check'
  ) THEN
    ALTER TABLE public.holarchelp_hospitals
      ADD CONSTRAINT holarchelp_hospitals_ownership_check
      CHECK (ownership = ANY (ARRAY['public'::text, 'private'::text]));
  END IF;
END $$;