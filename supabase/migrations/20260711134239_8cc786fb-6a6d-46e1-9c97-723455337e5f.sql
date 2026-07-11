
CREATE OR REPLACE FUNCTION public.enforce_nurse_rating_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_at timestamptz;
BEGIN
  SELECT MAX(created_at) INTO _last_at
  FROM public.nurse_record_ratings
  WHERE patient_user_id = NEW.patient_user_id
    AND nurse_id = NEW.nurse_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF _last_at IS NOT NULL AND _last_at > now() - interval '4 hours' THEN
    RAISE EXCEPTION 'NURSE_RATING_COOLDOWN: You can rate this nurse again after %',
      to_char(_last_at + interval '4 hours', 'YYYY-MM-DD HH24:MI:SS TZ');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_nurse_rating_cooldown ON public.nurse_record_ratings;
CREATE TRIGGER trg_enforce_nurse_rating_cooldown
BEFORE INSERT OR UPDATE ON public.nurse_record_ratings
FOR EACH ROW EXECUTE FUNCTION public.enforce_nurse_rating_cooldown();
