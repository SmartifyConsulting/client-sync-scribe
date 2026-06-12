-- Lock down OAuth token columns on calendar_connections so only service_role
-- (used by edge functions) can read or write them. Authenticated users can
-- still see connection metadata (id, provider, last_sync_at, etc.) and delete
-- their own row, but never touch the raw tokens directly.

REVOKE SELECT (access_token, refresh_token) ON public.calendar_connections FROM anon, authenticated;
REVOKE INSERT (access_token, refresh_token) ON public.calendar_connections FROM anon, authenticated;
REVOKE UPDATE (access_token, refresh_token) ON public.calendar_connections FROM anon, authenticated;

-- Ensure service_role retains full access for edge functions.
GRANT ALL ON public.calendar_connections TO service_role;