-- Revoke column-level access to OAuth tokens from client roles.
-- Service role (used by edge functions) retains full access via GRANT ALL elsewhere.
REVOKE SELECT (access_token, refresh_token) ON public.calendar_connections FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.calendar_connections FROM anon;
REVOKE INSERT (access_token, refresh_token) ON public.calendar_connections FROM authenticated;
REVOKE INSERT (access_token, refresh_token) ON public.calendar_connections FROM anon;
REVOKE UPDATE (access_token, refresh_token) ON public.calendar_connections FROM authenticated;
REVOKE UPDATE (access_token, refresh_token) ON public.calendar_connections FROM anon;