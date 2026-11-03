-- Same stale-rename bug as can_view_patient_record / doctor_had_access_at:
-- these seven functions predate the patients->clients rename and still
-- query the dropped "patients" table. Fixed to use "clients" (all are
-- unqualified "patients" references relying on search_path=public, so the
-- fix is a straight substitution — no other logic changed).

CREATE OR REPLACE FUNCTION public.wealth_auto_schedule_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE w record; pt record; due timestamptz; appt uuid;
BEGIN
  IF NEW.status = 'issued' AND NEW.review_date IS NULL THEN
    due := coalesce(NEW.issued_at, now()) + interval '12 months';
    NEW.review_date := due::date;
    SELECT * INTO w FROM wealth_workflows WHERE id = NEW.workflow_id;
    SELECT user_id, patient_user_id INTO pt FROM clients WHERE id = w.patient_id;
    IF w.annual_review_appointment_id IS NULL AND pt.user_id IS NOT NULL THEN
      INSERT INTO appointments(user_id, patient_id, title, description, start_time, end_time, type)
      VALUES (pt.user_id, w.patient_id, 'Annual review', 'Automatically scheduled 12 months after policy issue', date_trunc('day', due) + interval '10 hours', date_trunc('day', due) + interval '11 hours', 'annual_review')
      RETURNING id INTO appt;
      UPDATE wealth_workflows SET annual_review_appointment_id = appt, next_review_date = due::date WHERE id = w.id;
      INSERT INTO notifications(user_id, type, title, description, reference_id)
      SELECT u, 'appointment_accepted', 'Annual review scheduled', 'Your annual review is booked for ' || to_char(due, 'DD Mon YYYY'), w.patient_id
      FROM unnest(ARRAY[pt.user_id, pt.patient_user_id]) u WHERE u IS NOT NULL;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.wealth_claims_status_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND EXISTS (SELECT 1 FROM public.clients p WHERE p.id = NEW.patient_id AND p.patient_user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only your Wealth Manager can change the status of a claim.';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.wealth_financials_verify(_patient_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE wf record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id=_patient_id AND patient_user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Only the client can verify their own financial information';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM client_financial_profiles WHERE patient_id=_patient_id) THEN
    RAISE EXCEPTION 'No financial information has been captured yet';
  END IF;
  PERFORM set_config('wealth.verifying', 'on', true);
  UPDATE client_financial_profiles SET verified_at=now(), verified_by=auth.uid() WHERE patient_id=_patient_id;
  PERFORM set_config('wealth.verifying', 'off', true);
  SELECT * INTO wf FROM wealth_workflows WHERE patient_id=_patient_id AND current_stage='needs_analysis' AND status NOT IN ('completed','closed_declined') ORDER BY created_at DESC LIMIT 1;
  IF wf.id IS NOT NULL THEN
    PERFORM wealth_apply_stage(wf.id, 'information_required', '[]'::jsonb, 'client', 'Client verified financial information as complete and correct', NULL, NULL, NULL);
  END IF;
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.wealth_is_party(_patient uuid, _uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (SELECT 1 FROM clients p WHERE p.id = _patient AND (p.user_id = _uid OR p.patient_user_id = _uid));
$function$;

CREATE OR REPLACE FUNCTION public.wealth_is_workflow_owner(_wf uuid, _uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (SELECT 1 FROM wealth_workflows w JOIN clients p ON p.id = w.patient_id WHERE w.id = _wf AND (w.owner_user_id = _uid OR p.user_id = _uid));
$function$;

CREATE OR REPLACE FUNCTION public.wealth_is_workflow_party(_wf uuid, _uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (SELECT 1 FROM wealth_workflows w JOIN clients p ON p.id = w.patient_id WHERE w.id = _wf AND (w.owner_user_id = _uid OR p.user_id = _uid OR p.patient_user_id = _uid));
$function$;

CREATE OR REPLACE FUNCTION public.wealth_messages_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE p record; target uuid; sender_name text;
BEGIN
  SELECT user_id, patient_user_id INTO p FROM clients WHERE id = NEW.patient_id;
  target := CASE WHEN NEW.sender_id = p.user_id THEN p.patient_user_id ELSE p.user_id END;
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  IF target IS NOT NULL THEN
    INSERT INTO notifications(user_id, type, title, description, reference_id)
    VALUES (target, 'message', 'New message from ' || coalesce(split_part(sender_name,' ',1),'your contact'), left(NEW.body, 140), NEW.patient_id);
  END IF;
  RETURN NEW;
END $function$;
