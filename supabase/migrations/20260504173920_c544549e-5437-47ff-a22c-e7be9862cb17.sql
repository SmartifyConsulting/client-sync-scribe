CREATE INDEX IF NOT EXISTS idx_profiles_country_lower ON public.profiles ((LOWER(country)));

CREATE OR REPLACE FUNCTION public.auto_enable_holarchelp_for_country()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF LOWER(COALESCE(NEW.country,'')) IN ('south africa','za','rsa','nigeria','ng') THEN
    NEW.holarchelp_enabled := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enable_holarchelp ON public.profiles;
CREATE TRIGGER trg_auto_enable_holarchelp
BEFORE INSERT OR UPDATE OF country ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_enable_holarchelp_for_country();