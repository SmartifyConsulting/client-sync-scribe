CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_key text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX login_events_user_session_idx ON public.login_events (user_id, session_key);
CREATE INDEX login_events_started_at_idx ON public.login_events (started_at);

GRANT SELECT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login events"
ON public.login_events FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all login events"
ON public.login_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_login_event(_session_key text, _user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR _session_key IS NULL OR _session_key = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.login_events (user_id, session_key, user_agent)
  VALUES (auth.uid(), _session_key, left(coalesce(_user_agent, ''), 300))
  ON CONFLICT (user_id, session_key)
  DO UPDATE SET last_seen_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_login_event(_session_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  UPDATE public.login_events
     SET last_seen_at = now()
   WHERE user_id = auth.uid()
     AND session_key = _session_key
     AND ended_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_login_event(_session_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  UPDATE public.login_events
     SET last_seen_at = now(), ended_at = now()
   WHERE user_id = auth.uid()
     AND session_key = _session_key
     AND ended_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_login_event(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_login_event(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_login_event(text) TO authenticated;