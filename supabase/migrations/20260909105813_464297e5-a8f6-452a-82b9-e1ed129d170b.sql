CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.norm_lang(_v text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _v IS NULL OR btrim(_v) = '' THEN NULL
    WHEN lower(btrim(_v)) IN ('en','eng','english') THEN 'en'
    WHEN lower(btrim(_v)) IN ('af','afr','afrikaans') THEN 'af'
    WHEN lower(btrim(_v)) IN ('zu','zul','zulu','isizulu') THEN 'zu'
    WHEN lower(btrim(_v)) IN ('xh','xho','xhosa','isixhosa') THEN 'xh'
    WHEN lower(btrim(_v)) IN ('st','sot','sotho','sesotho') THEN 'st'
    WHEN lower(btrim(_v)) IN ('fr','fra','fre','french','francais') THEN 'fr'
    WHEN lower(btrim(_v)) IN ('pt','por','portuguese','portugues') THEN 'pt'
    WHEN lower(btrim(_v)) IN ('es','spa','spanish','espanol') THEN 'es'
    WHEN lower(btrim(_v)) IN ('sw','swa','swahili','kiswahili') THEN 'sw'
    WHEN lower(btrim(_v)) IN ('yo','yor','yoruba') THEN 'yo'
    WHEN lower(btrim(_v)) IN ('ig','ibo','igbo') THEN 'ig'
    WHEN lower(btrim(_v)) IN ('ha','hau','hausa') THEN 'ha'
    ELSE left(lower(btrim(_v)), 2)
  END;
$$;

-- Fuzzy name score: 1.0 exact-ish contains, otherwise trigram similarity of the
-- whole string or of the best-matching word. 0 means "no match".
CREATE OR REPLACE FUNCTION public.name_match_score(_name text, _q text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _q IS NULL OR btrim(_q) = '' THEN 1::numeric
    WHEN _name IS NULL OR btrim(_name) = '' THEN 0::numeric
    WHEN _name ILIKE '%'||btrim(_q)||'%' THEN 1::numeric
    ELSE GREATEST(
      similarity(lower(_name), lower(btrim(_q)))::numeric,
      COALESCE((
        SELECT MAX(similarity(w, qw))::numeric
        FROM unnest(string_to_array(lower(regexp_replace(_name, '[^a-zA-Z0-9 ]', ' ', 'g')), ' ')) AS w
        CROSS JOIN unnest(string_to_array(lower(regexp_replace(btrim(_q), '[^a-zA-Z0-9 ]', ' ', 'g')), ' ')) AS qw
        WHERE w <> '' AND qw <> ''
      ), 0::numeric)
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.search_providers(_name text DEFAULT NULL::text, _specialty text DEFAULT NULL::text, _language text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, kind text, full_name text, specialty text, address text, phone text, avatar_url text, registration text, about_me text, preferred_language text, stars numeric, ownership text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT NULLIF(btrim(COALESCE(_name, '')), '') AS name_q,
           NULLIF(btrim(COALESCE(_specialty, '')), '') AS spec_q,
           public.norm_lang(_language) AS lang_q
  ), rows AS (
    SELECT p.id, 'doctor'::text AS kind,
           p.full_name, p.specialty, p.practice_address AS address, p.mobile_number AS phone, p.avatar_url,
           COALESCE(p.practice_number, p.doctor_number) AS registration,
           p.about_me, p.preferred_language,
           COALESCE(p.credential_score,
             (3
              + CASE WHEN p.specialty IS NOT NULL AND p.specialty <> '' THEN 1 ELSE 0 END
              + CASE WHEN p.practice_number IS NOT NULL AND p.doctor_number IS NOT NULL THEN 1 ELSE 0 END
             )::numeric) AS stars,
           NULL::text AS ownership,
           GREATEST(
             public.name_match_score(p.full_name, q.name_q),
             CASE WHEN q.name_q IS NOT NULL AND (
                    p.practice_number = q.name_q OR p.doctor_number = q.name_q
                    OR u.email ILIKE '%'||q.name_q||'%'
                  ) THEN 1::numeric ELSE 0::numeric END
           ) AS score
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    CROSS JOIN q
    WHERE p.role = 'doctor'::user_role
      AND auth.uid() IS NOT NULL
      AND (q.spec_q IS NULL OR p.specialty ILIKE '%'||q.spec_q||'%')
      AND (q.lang_q IS NULL OR public.norm_lang(p.preferred_language) = q.lang_q)

    UNION ALL
    SELECT h.id, 'hospital'::text,
           h.name, NULL, COALESCE(h.address,'') || CASE WHEN h.city IS NOT NULL THEN ', '||h.city ELSE '' END,
           h.contact_phone, NULL, h.registration_number,
           NULL, NULL, COALESCE(h.credential_score, 4::numeric), h.ownership,
           GREATEST(
             public.name_match_score(h.name, q.name_q),
             CASE WHEN q.name_q IS NOT NULL AND h.registration_number = q.name_q THEN 1::numeric ELSE 0::numeric END
           )
    FROM public.holarchelp_hospitals h
    CROSS JOIN q
    WHERE h.status = 'approved' AND auth.uid() IS NOT NULL
      AND q.spec_q IS NULL AND q.lang_q IS NULL

    UNION ALL
    SELECT a.id, 'ambulance'::text,
           a.company_name, NULL, COALESCE(a.base_address,'') || CASE WHEN a.city IS NOT NULL THEN ', '||a.city ELSE '' END,
           a.contact_phone, NULL, a.registration_number,
           NULL, NULL, COALESCE(a.credential_score, 4::numeric), a.ownership,
           GREATEST(
             public.name_match_score(a.company_name, q.name_q),
             CASE WHEN q.name_q IS NOT NULL AND a.registration_number = q.name_q THEN 1::numeric ELSE 0::numeric END
           )
    FROM public.holarchelp_ambulance_providers a
    CROSS JOIN q
    WHERE a.status = 'approved' AND auth.uid() IS NOT NULL
      AND q.spec_q IS NULL AND q.lang_q IS NULL
  )
  SELECT id, kind, full_name, specialty, address, phone, avatar_url, registration,
         about_me, preferred_language, stars, ownership
  FROM rows
  WHERE score >= 0.28
  ORDER BY score DESC, full_name ASC
  LIMIT 100;
$function$;

DROP FUNCTION IF EXISTS public.get_users_admin();

CREATE OR REPLACE FUNCTION public.get_users_admin()
 RETURNS TABLE(user_id uuid, email text, full_name text, role text, created_at timestamp with time zone, status text, last_sign_in_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    u.email::text,
    p.full_name,
    COALESCE(ur.role::text, 'none') AS role,
    p.created_at,
    COALESCE(p.status, 'active') AS status,
    u.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$function$;