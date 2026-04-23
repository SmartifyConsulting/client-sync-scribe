-- 1. Practices table
CREATE TABLE public.practices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Practice members
CREATE TABLE public.practice_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (practice_id, doctor_id)
);

CREATE INDEX practice_members_doctor_idx ON public.practice_members(doctor_id);
CREATE INDEX practice_members_practice_idx ON public.practice_members(practice_id);

-- 3. Practice invitations
CREATE TABLE public.practice_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);

CREATE INDEX practice_invitations_email_idx ON public.practice_invitations(lower(invited_email));
CREATE INDEX practice_invitations_practice_idx ON public.practice_invitations(practice_id);

-- 4. Appointments: add practice_id
ALTER TABLE public.appointments
  ADD COLUMN practice_id uuid REFERENCES public.practices(id) ON DELETE SET NULL;
CREATE INDEX appointments_practice_id_idx ON public.appointments(practice_id);

-- 5. Profiles: per-doctor calendar color
ALTER TABLE public.profiles ADD COLUMN practice_color text DEFAULT '#0EA5E9';

-- 6. Membership helper (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_practice_member(_practice_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.practice_members
    WHERE practice_id = _practice_id AND doctor_id = _user_id
  )
$$;

-- 7. Practice owner helper
CREATE OR REPLACE FUNCTION public.is_practice_owner(_practice_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.practices
    WHERE id = _practice_id AND owner_id = _user_id
  )
$$;

-- 8. Triggers for updated_at
CREATE TRIGGER update_practices_updated_at
BEFORE UPDATE ON public.practices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Enable RLS
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_invitations ENABLE ROW LEVEL SECURITY;

-- 10. RLS: practices
CREATE POLICY "Members or owner can view practices"
ON public.practices FOR SELECT
USING (owner_id = auth.uid() OR public.is_practice_member(id, auth.uid()));

CREATE POLICY "Doctors can create practices"
ON public.practices FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update practice"
ON public.practices FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete practice"
ON public.practices FOR DELETE
USING (owner_id = auth.uid());

-- 11. RLS: practice_members
CREATE POLICY "Members can view fellow members"
ON public.practice_members FOR SELECT
USING (public.is_practice_member(practice_id, auth.uid()) OR public.is_practice_owner(practice_id, auth.uid()));

CREATE POLICY "Owner can add members"
ON public.practice_members FOR INSERT
WITH CHECK (public.is_practice_owner(practice_id, auth.uid()) OR doctor_id = auth.uid());

CREATE POLICY "Owner or self can remove member"
ON public.practice_members FOR DELETE
USING (public.is_practice_owner(practice_id, auth.uid()) OR doctor_id = auth.uid());

-- 12. RLS: practice_invitations
CREATE POLICY "Owner manages invitations"
ON public.practice_invitations FOR ALL
USING (public.is_practice_owner(practice_id, auth.uid()))
WITH CHECK (public.is_practice_owner(practice_id, auth.uid()));

CREATE POLICY "Invitee can view own invitations by email"
ON public.practice_invitations FOR SELECT
USING (lower(invited_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "Invitee can update own invitation status"
ON public.practice_invitations FOR UPDATE
USING (lower(invited_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

-- 13. Extend appointments policies for practice members
CREATE POLICY "Practice members can view shared appointments"
ON public.appointments FOR SELECT
USING (practice_id IS NOT NULL AND public.is_practice_member(practice_id, auth.uid()));
