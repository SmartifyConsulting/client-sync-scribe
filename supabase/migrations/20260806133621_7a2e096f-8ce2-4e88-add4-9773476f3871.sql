DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;
CREATE POLICY "Only admins can delete sessions"
ON public.sessions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));