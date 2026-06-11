
-- Normalize first
UPDATE public.profiles
SET mobile_number = regexp_replace(mobile_number, '\s+', '', 'g')
WHERE mobile_number IS NOT NULL AND mobile_number ~ '\s';

-- Clear duplicates (keep earliest created_at)
WITH ranked AS (
  SELECT id, mobile_number,
    ROW_NUMBER() OVER (PARTITION BY mobile_number ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.profiles
  WHERE mobile_number IS NOT NULL AND mobile_number <> ''
)
UPDATE public.profiles p
SET mobile_number = NULL
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

CREATE OR REPLACE FUNCTION public.profiles_normalize_mobile_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.mobile_number IS NOT NULL THEN
    NEW.mobile_number := regexp_replace(NEW.mobile_number, '\s+', '', 'g');
    IF NEW.mobile_number = '' THEN
      NEW.mobile_number := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_normalize_mobile_number_trg ON public.profiles;
CREATE TRIGGER profiles_normalize_mobile_number_trg
BEFORE INSERT OR UPDATE OF mobile_number ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_normalize_mobile_number();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_mobile_number_unique_idx
ON public.profiles (mobile_number)
WHERE mobile_number IS NOT NULL;
