-- 1. Country backfill / normalisation ------------------------------------
UPDATE public.profiles
   SET country = 'NG'
 WHERE mobile_number LIKE '+234%' OR mobile_number LIKE '234%';

UPDATE public.profiles
   SET country = 'ZA'
 WHERE country IS NOT NULL
   AND country <> 'NG'
   AND lower(btrim(country)) IN ('za', 'rsa', 'south africa');

UPDATE public.profiles
   SET country = 'ZA'
 WHERE country IS NULL
   AND (mobile_number LIKE '+27%' OR mobile_number LIKE '27%');

CREATE OR REPLACE FUNCTION public.country_from_dial_code(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _phone IS NULL OR btrim(_phone) = '' THEN NULL
    WHEN regexp_replace(_phone, '\D', '', 'g') LIKE '234%' THEN 'NG'
    WHEN regexp_replace(_phone, '\D', '', 'g') LIKE '27%'  THEN 'ZA'
    ELSE NULL
  END
$$;

-- Keep country in step with the phone number going forward.
CREATE OR REPLACE FUNCTION public.set_profile_country_from_phone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.mobile_number IS NOT NULL
     AND (NEW.country IS NULL OR btrim(NEW.country) = '') THEN
    NEW.country := public.country_from_dial_code(NEW.mobile_number);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_country_from_phone ON public.profiles;
CREATE TRIGGER profiles_country_from_phone
BEFORE INSERT OR UPDATE OF mobile_number, country ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_country_from_phone();

-- 2. Per-user performance report ------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_user_performance(
  _country text DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text,
  country text,
  signed_up timestamptz,
  last_sign_in timestamptz,
  last_active timestamptz,
  returned boolean,
  activated boolean,
  sessions_count bigint,
  documents_count bigint,
  prescriptions_count bigint,
  appointments_count bigint,
  checkins_count bigint,
  incidents_count bigint,
  login_days bigint,
  minutes_active numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT p.id,
           p.full_name,
           u.email::text                              AS email,
           coalesce(p.role::text, 'unknown')          AS role,
           coalesce(nullif(btrim(p.country), ''), 'Unspecified') AS country,
           u.created_at                               AS signed_up,
           u.last_sign_in_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE (_country IS NULL
           OR coalesce(nullif(btrim(p.country), ''), 'Unspecified') = _country)
      AND (_from IS NULL OR u.created_at >= _from)
      AND (_to   IS NULL OR u.created_at < (_to + 1))
  )
  SELECT b.id,
         b.full_name,
         b.email,
         b.role,
         b.country,
         b.signed_up,
         b.last_sign_in_at,
         GREATEST(
           b.last_sign_in_at,
           (SELECT max(s.created_at)  FROM public.sessions s        WHERE s.user_id = b.id),
           (SELECT max(d.created_at)  FROM public.documents d       WHERE d.user_id = b.id),
           (SELECT max(e.created_at)  FROM public.biolog_entries e  WHERE e.user_id = b.id),
           (SELECT max(l.last_seen_at) FROM public.login_events l   WHERE l.user_id = b.id)
         ) AS last_active,
         coalesce(b.last_sign_in_at::date > b.signed_up::date, false) AS returned,
         (
           (SELECT count(*) FROM public.sessions s       WHERE s.user_id = b.id)
         + (SELECT count(*) FROM public.documents d      WHERE d.user_id = b.id)
         + (SELECT count(*) FROM public.biolog_entries e WHERE e.user_id = b.id)
         + (SELECT count(*) FROM public.appointments a   WHERE a.user_id = b.id)
         ) > 0 AS activated,
         (SELECT count(*) FROM public.sessions s      WHERE s.user_id = b.id),
         (SELECT count(*) FROM public.documents d     WHERE d.user_id = b.id),
         (SELECT count(*) FROM public.prescriptions r WHERE r.doctor_id = b.id),
         (SELECT count(*) FROM public.appointments a  WHERE a.user_id = b.id),
         (SELECT count(*) FROM public.biolog_entries e WHERE e.user_id = b.id),
         (SELECT count(*) FROM public.holarchelp_incidents i
            WHERE i.user_id = b.id OR i.patient_user_id = b.id OR i.triggered_by_user_id = b.id),
         (SELECT count(DISTINCT l.started_at::date) FROM public.login_events l WHERE l.user_id = b.id),
         (SELECT round(coalesce(sum(extract(epoch FROM (coalesce(l.ended_at, l.last_seen_at) - l.started_at))), 0) / 60.0, 1)
            FROM public.login_events l WHERE l.user_id = b.id)
  FROM base b
  ORDER BY b.signed_up DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_user_performance(text, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_performance(text, date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_country_list()
RETURNS TABLE (country text, users bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  RETURN QUERY
  SELECT coalesce(nullif(btrim(p.country), ''), 'Unspecified') AS country, count(*)
  FROM public.profiles p
  GROUP BY 1
  ORDER BY 2 DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_country_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_country_list() TO authenticated;