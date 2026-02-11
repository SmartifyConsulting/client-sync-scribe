
-- Add round_table_enabled to profiles for patient preference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS round_table_enabled boolean DEFAULT false;

-- Add admin update policy for profiles (so admins can edit user records)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add admin update policy for user_roles
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add admin delete policy for user_roles (needed for role changes)
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add admin insert policy for user_roles
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
