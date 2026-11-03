-- Keep login activity separate so recording a login does not alter Configured date.
CREATE TABLE IF NOT EXISTS public.broker_portal_login_status (
  broker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id text NOT NULL REFERENCES public.app_integrations_catalog(id) ON DELETE CASCADE,
  last_successful_login_at timestamptz NOT NULL,
  PRIMARY KEY (broker_user_id, integration_id)
);
ALTER TABLE public.broker_portal_login_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own portal login status" ON public.broker_portal_login_status;
CREATE POLICY "Read own portal login status" ON public.broker_portal_login_status
FOR SELECT TO authenticated USING (broker_user_id = auth.uid());
REVOKE ALL ON public.broker_portal_login_status FROM anon, authenticated;
GRANT SELECT ON public.broker_portal_login_status TO authenticated;

CREATE OR REPLACE FUNCTION public.record_broker_portal_login(_integration_id text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE recorded_at timestamptz := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_integrations_catalog WHERE id=_integration_id AND is_active) THEN
    RAISE EXCEPTION 'Provider not found';
  END IF;
  INSERT INTO public.broker_portal_login_status(broker_user_id,integration_id,last_successful_login_at)
  VALUES(auth.uid(),_integration_id,recorded_at)
  ON CONFLICT(broker_user_id,integration_id) DO UPDATE SET last_successful_login_at=EXCLUDED.last_successful_login_at;
  RETURN recorded_at;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_broker_portal_login(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_broker_portal_login(text) TO authenticated;
