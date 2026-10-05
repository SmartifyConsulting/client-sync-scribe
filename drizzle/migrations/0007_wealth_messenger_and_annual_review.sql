-- Audited client <-> Wealth Manager messages (append-only)
CREATE TABLE public.wealth_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  kind text NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat','change_request','counter','accept','redraft')),
  recommendation_id uuid REFERENCES public.wealth_recommendations(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wealth_messages_patient_idx ON public.wealth_messages(patient_id, created_at);
GRANT SELECT, INSERT ON public.wealth_messages TO authenticated;
GRANT ALL ON public.wealth_messages TO service_role;
ALTER TABLE public.wealth_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.wealth_is_party(_patient uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM patients p WHERE p.id = _patient AND (p.user_id = _uid OR p.patient_user_id = _uid));
$$;

CREATE POLICY "Parties read messages" ON public.wealth_messages FOR SELECT TO authenticated
  USING (public.wealth_is_party(patient_id, auth.uid()));
CREATE POLICY "Parties send own messages" ON public.wealth_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.wealth_is_party(patient_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.wealth_messages_mark_read(_patient uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE wealth_messages SET read_at = now()
  WHERE patient_id = _patient AND read_at IS NULL AND sender_id <> auth.uid()
    AND public.wealth_is_party(_patient, auth.uid());
$$;

-- Notify the other party
CREATE OR REPLACE FUNCTION public.wealth_messages_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; target uuid; sender_name text;
BEGIN
  SELECT user_id, patient_user_id INTO p FROM patients WHERE id = NEW.patient_id;
  target := CASE WHEN NEW.sender_id = p.user_id THEN p.patient_user_id ELSE p.user_id END;
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  IF target IS NOT NULL THEN
    INSERT INTO notifications(user_id, type, title, description, reference_id)
    VALUES (target, 'message', 'New message from ' || coalesce(split_part(sender_name,' ',1),'your contact'), left(NEW.body, 140), NEW.patient_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER wealth_messages_notify_trg AFTER INSERT ON public.wealth_messages
  FOR EACH ROW EXECUTE FUNCTION public.wealth_messages_notify();

ALTER PUBLICATION supabase_realtime ADD TABLE public.wealth_messages;

-- Clients can always see their own Wealth Manager's profile (name/avatar)
CREATE POLICY "Clients view their wealth manager profile" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM patients p WHERE p.patient_user_id = auth.uid() AND p.user_id = profiles.id));

-- Auto-schedule the annual review 12 months after issue
CREATE OR REPLACE FUNCTION public.wealth_auto_schedule_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; pt record; due timestamptz; appt uuid;
BEGIN
  IF NEW.status = 'issued' AND NEW.review_date IS NULL THEN
    due := coalesce(NEW.issued_at, now()) + interval '12 months';
    NEW.review_date := due::date;
    SELECT * INTO w FROM wealth_workflows WHERE id = NEW.workflow_id;
    SELECT user_id, patient_user_id INTO pt FROM patients WHERE id = w.patient_id;
    IF w.annual_review_appointment_id IS NULL AND pt.user_id IS NOT NULL THEN
      INSERT INTO appointments(user_id, patient_id, title, description, start_time, end_time, type)
      VALUES (pt.user_id, w.patient_id, 'Annual review', 'Automatically scheduled 12 months after policy issue',
              date_trunc('day', due) + interval '10 hours', date_trunc('day', due) + interval '11 hours', 'annual_review')
      RETURNING id INTO appt;
      UPDATE wealth_workflows SET annual_review_appointment_id = appt, next_review_date = due::date WHERE id = w.id;
      INSERT INTO notifications(user_id, type, title, description, reference_id)
      SELECT u, 'appointment_accepted', 'Annual review scheduled', 'Your annual review is booked for ' || to_char(due, 'DD Mon YYYY'), w.patient_id
      FROM unnest(ARRAY[pt.user_id, pt.patient_user_id]) u WHERE u IS NOT NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER wealth_auto_schedule_review_trg BEFORE INSERT OR UPDATE OF status ON public.wealth_applications
  FOR EACH ROW EXECUTE FUNCTION public.wealth_auto_schedule_review();