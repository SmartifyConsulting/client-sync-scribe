ALTER TABLE public.round_table_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

DROP POLICY IF EXISTS rt_msgs_update ON public.round_table_messages;
CREATE POLICY rt_msgs_update ON public.round_table_messages
FOR UPDATE TO authenticated
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE OR REPLACE FUNCTION public.notify_round_table_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic public.round_table_topics%ROWTYPE;
  v_patient public.patients%ROWTYPE;
  v_actor uuid;
  v_actor_name text;
  v_title text;
  v_desc text;
BEGIN
  IF TG_TABLE_NAME = 'round_table_topics' THEN
    v_topic := NEW;
    v_actor := NEW.doctor_id;
    v_actor_name := COALESCE(NEW.doctor_name, 'A doctor');
    v_title := 'New round table topic';
  ELSE
    SELECT * INTO v_topic FROM public.round_table_topics WHERE id = NEW.topic_id;
    v_actor := NEW.doctor_id;
    v_actor_name := COALESCE(NEW.doctor_name, 'A doctor');
    v_title := 'New round table comment';
  END IF;

  IF v_topic.id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_patient FROM public.patients WHERE id = v_topic.patient_id;

  v_desc := v_actor_name || ' commented on "' || COALESCE(v_topic.subject, 'a topic') || '" for ' || COALESCE(v_patient.name, 'a patient');

  INSERT INTO public.notifications (user_id, type, title, description, reference_id)
  SELECT DISTINCT d.doctor_id, 'round_table', v_title, v_desc, v_topic.patient_id
  FROM (
    SELECT dpa.doctor_id
    FROM public.doctor_patient_access dpa
    WHERE dpa.patient_user_id = v_patient.patient_user_id
      AND dpa.is_active = true
      AND v_patient.patient_user_id IS NOT NULL
    UNION
    SELECT v_patient.user_id WHERE v_patient.user_id IS NOT NULL
  ) d
  WHERE d.doctor_id IS NOT NULL AND d.doctor_id <> v_actor;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_rt_message ON public.round_table_messages;
CREATE TRIGGER trg_notify_rt_message
AFTER INSERT ON public.round_table_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_round_table_activity();

DROP TRIGGER IF EXISTS trg_notify_rt_topic ON public.round_table_topics;
CREATE TRIGGER trg_notify_rt_topic
AFTER INSERT ON public.round_table_topics
FOR EACH ROW EXECUTE FUNCTION public.notify_round_table_activity();