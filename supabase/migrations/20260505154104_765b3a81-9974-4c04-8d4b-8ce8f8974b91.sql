
-- 1) Round Table: topic-based discussion with realtime messages
CREATE TABLE IF NOT EXISTS public.round_table_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  doctor_name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.round_table_topics ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.round_table_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.round_table_topics(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  doctor_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.round_table_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rt_topics_patient ON public.round_table_topics(patient_id);
CREATE INDEX IF NOT EXISTS idx_rt_messages_topic ON public.round_table_messages(topic_id);

-- helper: doctor has access to this patient OR is the patient owner
CREATE OR REPLACE FUNCTION public.user_can_access_patient_rt(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = _patient_id
      AND (
        p.user_id = auth.uid()
        OR p.patient_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM doctor_patient_access dpa
          WHERE dpa.patient_user_id = p.patient_user_id
            AND dpa.doctor_id = auth.uid()
            AND dpa.is_active = true
        )
      )
  )
$$;

CREATE POLICY "rt_topics_select" ON public.round_table_topics FOR SELECT TO authenticated
  USING (public.user_can_access_patient_rt(patient_id));
CREATE POLICY "rt_topics_insert" ON public.round_table_topics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = doctor_id AND public.user_can_access_patient_rt(patient_id));
CREATE POLICY "rt_topics_update" ON public.round_table_topics FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id);
CREATE POLICY "rt_topics_delete" ON public.round_table_topics FOR DELETE TO authenticated
  USING (auth.uid() = doctor_id);

CREATE POLICY "rt_msgs_select" ON public.round_table_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM round_table_topics t WHERE t.id = topic_id AND public.user_can_access_patient_rt(t.patient_id)));
CREATE POLICY "rt_msgs_insert" ON public.round_table_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = doctor_id AND EXISTS (SELECT 1 FROM round_table_topics t WHERE t.id = topic_id AND public.user_can_access_patient_rt(t.patient_id)));
CREATE POLICY "rt_msgs_delete" ON public.round_table_messages FOR DELETE TO authenticated
  USING (auth.uid() = doctor_id);

CREATE TRIGGER trg_rt_topics_updated BEFORE UPDATE ON public.round_table_topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.round_table_topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.round_table_messages;
ALTER TABLE public.round_table_topics REPLICA IDENTITY FULL;
ALTER TABLE public.round_table_messages REPLICA IDENTITY FULL;

-- 2) Unified provider search: doctors + hospitals + ambulances
CREATE OR REPLACE FUNCTION public.search_providers(_name text DEFAULT NULL, _specialty text DEFAULT NULL, _language text DEFAULT NULL)
RETURNS TABLE(
  id uuid, kind text, full_name text, specialty text, address text,
  phone text, avatar_url text, registration text, about_me text,
  preferred_language text, stars numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, 'doctor'::text,
         p.full_name, p.specialty, p.practice_address, p.mobile_number, p.avatar_url,
         COALESCE(p.practice_number, p.doctor_number),
         p.about_me, p.preferred_language,
         (3
          + CASE WHEN p.specialty IS NOT NULL AND p.specialty <> '' THEN 1 ELSE 0 END
          + CASE WHEN p.practice_number IS NOT NULL AND p.doctor_number IS NOT NULL THEN 1 ELSE 0 END
         )::numeric AS stars
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
         NULL, NULL, 4::numeric
  FROM public.holarchelp_hospitals h
  WHERE h.status = 'approved'
    AND auth.uid() IS NOT NULL
    AND (_name IS NULL OR _name = '' OR h.name ILIKE '%'||_name||'%')
    AND (_specialty IS NULL OR _specialty = '')
    AND (_language IS NULL OR _language = '')

  UNION ALL
  SELECT a.id, 'ambulance'::text,
         a.company_name, NULL, COALESCE(a.base_address,'') || CASE WHEN a.city IS NOT NULL THEN ', '||a.city ELSE '' END,
         a.contact_phone, NULL, a.registration_number,
         NULL, NULL, 4::numeric
  FROM public.holarchelp_ambulance_providers a
  WHERE a.status = 'approved'
    AND auth.uid() IS NOT NULL
    AND (_name IS NULL OR _name = '' OR a.company_name ILIKE '%'||_name||'%')
    AND (_specialty IS NULL OR _specialty = '')
    AND (_language IS NULL OR _language = '')
  LIMIT 100;
$$;
