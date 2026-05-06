-- AI credential score for providers
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS credential_score numeric,
  ADD COLUMN IF NOT EXISTS credential_score_updated_at timestamptz;
ALTER TABLE public.holarchelp_hospitals 
  ADD COLUMN IF NOT EXISTS credential_score numeric,
  ADD COLUMN IF NOT EXISTS credential_score_updated_at timestamptz;
ALTER TABLE public.holarchelp_ambulance_providers 
  ADD COLUMN IF NOT EXISTS credential_score numeric,
  ADD COLUMN IF NOT EXISTS credential_score_updated_at timestamptz;

-- Update search_providers to use AI score when available
CREATE OR REPLACE FUNCTION public.search_providers(_name text DEFAULT NULL::text, _specialty text DEFAULT NULL::text, _language text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, kind text, full_name text, specialty text, address text, phone text, avatar_url text, registration text, about_me text, preferred_language text, stars numeric, ownership text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, 'doctor'::text,
         p.full_name, p.specialty, p.practice_address, p.mobile_number, p.avatar_url,
         COALESCE(p.practice_number, p.doctor_number),
         p.about_me, p.preferred_language,
         COALESCE(p.credential_score,
           (3
            + CASE WHEN p.specialty IS NOT NULL AND p.specialty <> '' THEN 1 ELSE 0 END
            + CASE WHEN p.practice_number IS NOT NULL AND p.doctor_number IS NOT NULL THEN 1 ELSE 0 END
           )::numeric) AS stars,
         NULL::text AS ownership
  FROM public.profiles p
  WHERE p.role = 'doctor'::user_role
    AND auth.uid() IS NOT NULL
    AND (_name IS NULL OR _name = '' OR p.full_name ILIKE '%'||_name||'%' OR p.practice_number = _name OR p.doctor_number = _name)
    AND (_specialty IS NULL OR _specialty = '' OR p.specialty ILIKE '%'||_specialty||'%')
    AND (_language IS NULL OR _language = '' OR p.preferred_language = _language)
  UNION ALL
  SELECT h.id, 'hospital'::text,
         h.name, NULL, COALESCE(h.address,'') || CASE WHEN h.city IS NOT NULL THEN ', '||h.city ELSE '' END,
         h.contact_phone, NULL, h.registration_number,
         NULL, NULL, COALESCE(h.credential_score, 4::numeric), h.ownership
  FROM public.holarchelp_hospitals h
  WHERE h.status = 'approved' AND auth.uid() IS NOT NULL
    AND (_name IS NULL OR _name = '' OR h.name ILIKE '%'||_name||'%')
    AND (_specialty IS NULL OR _specialty = '')
    AND (_language IS NULL OR _language = '')
  UNION ALL
  SELECT a.id, 'ambulance'::text,
         a.company_name, NULL, COALESCE(a.base_address,'') || CASE WHEN a.city IS NOT NULL THEN ', '||a.city ELSE '' END,
         a.contact_phone, NULL, a.registration_number,
         NULL, NULL, COALESCE(a.credential_score, 4::numeric), a.ownership
  FROM public.holarchelp_ambulance_providers a
  WHERE a.status = 'approved' AND auth.uid() IS NOT NULL
    AND (_name IS NULL OR _name = '' OR a.company_name ILIKE '%'||_name||'%')
    AND (_specialty IS NULL OR _specialty = '')
    AND (_language IS NULL OR _language = '')
  LIMIT 100;
$function$;