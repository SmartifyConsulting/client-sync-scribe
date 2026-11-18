CREATE OR REPLACE FUNCTION public.is_client_of_owner(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wealth_workflows w
    JOIN public.clients c ON c.id = w.patient_id
    WHERE w.owner_user_id = _owner AND c.patient_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.clients c WHERE c.user_id = _owner AND c.patient_user_id = auth.uid()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_client_of_owner(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_client_of_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "Signed-in users can read practice info" ON public.wealth_practice_info;
CREATE POLICY "Clients read their Wealth Manager practice info" ON public.wealth_practice_info
  FOR SELECT TO authenticated USING (public.is_client_of_owner(user_id));

DROP POLICY IF EXISTS "Practice logos readable by signed-in users" ON storage.objects;
CREATE POLICY "Practice logos readable by owner or their clients" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'practice-logos' AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.is_client_of_owner(((storage.foldername(name))[1])::uuid)
      OR public.has_role(auth.uid(), 'admin'::user_role)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view pricing" ON public.pricing_config;
CREATE POLICY "Signed-in users can view pricing" ON public.pricing_config
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view streak config" ON public.streak_config;
CREATE POLICY "Signed-in users can view streak config" ON public.streak_config
  FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);