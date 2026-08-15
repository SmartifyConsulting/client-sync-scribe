ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS v2_demo boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Admins can update v2 demo flag" ON public.profiles;
CREATE POLICY "Admins can update v2 demo flag"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

UPDATE public.profiles p
SET v2_demo = true
FROM auth.users u
WHERE u.id = p.id AND lower(u.email) = 'georgia.adams@smartify.co.za';