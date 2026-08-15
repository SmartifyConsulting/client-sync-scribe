GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO authenticated;
GRANT ALL ON TABLE public.patients TO service_role;
GRANT ALL ON TABLE public.sessions TO service_role;