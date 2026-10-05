-- Adds the two wealth-team roles (Referral Agent, FSP) to the user_role enum
-- and a table to invite/track them, alongside existing Client (patient) and
-- Wealth Manager (doctor) roles. Only Wealth Managers (role 'doctor') who
-- also hold the 'admin' role may invite or manage team members.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'referral_agent';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'fsp';

CREATE TABLE IF NOT EXISTS public.wealth_team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role public.user_role NOT NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'cancelled')),
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wealth_team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their own team invites"
  ON public.wealth_team_invites FOR ALL
  USING (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );
