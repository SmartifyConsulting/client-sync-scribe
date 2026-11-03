ALTER TABLE public.broker_portal_login_status
  ALTER COLUMN last_successful_login_at DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS last_connect_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_connect_outcome text CHECK(last_connect_outcome IN ('success','failed','unconfirmed'));
UPDATE public.broker_portal_login_status SET last_connect_at=last_successful_login_at,last_connect_outcome='success'
WHERE last_connect_at IS NULL AND last_successful_login_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_broker_portal_connection(_integration_id text,_outcome text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE recorded_at timestamptz := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
  IF _outcome IS NULL OR _outcome NOT IN ('success','failed','unconfirmed') THEN RAISE EXCEPTION 'Invalid connection result'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_integrations_catalog WHERE id=_integration_id AND is_active) THEN RAISE EXCEPTION 'Provider not found'; END IF;
  INSERT INTO public.broker_portal_login_status(broker_user_id,integration_id,last_successful_login_at,last_connect_at,last_connect_outcome)
  VALUES(auth.uid(),_integration_id,CASE WHEN _outcome='success' THEN recorded_at END,recorded_at,_outcome)
  ON CONFLICT(broker_user_id,integration_id) DO UPDATE SET
    last_connect_at=EXCLUDED.last_connect_at,last_connect_outcome=EXCLUDED.last_connect_outcome,
    last_successful_login_at=CASE WHEN _outcome='success' THEN recorded_at ELSE broker_portal_login_status.last_successful_login_at END;
  RETURN recorded_at;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_broker_portal_connection(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_broker_portal_connection(text,text) TO authenticated;

-- Older clients still record a genuine success through the existing RPC.
CREATE OR REPLACE FUNCTION public.record_broker_portal_login(_integration_id text)
RETURNS timestamptz LANGUAGE sql SECURITY DEFINER SET search_path=public AS $function$
  SELECT public.record_broker_portal_connection(_integration_id,'success');
$function$;
