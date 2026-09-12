REVOKE EXECUTE ON FUNCTION public.record_login_event(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_login_event(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.end_login_event(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login_event(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_login_event(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_login_event(text) TO authenticated;