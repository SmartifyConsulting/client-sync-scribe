ALTER TABLE public.wealth_practice_info ADD COLUMN IF NOT EXISTS business_logo_path text, ADD COLUMN IF NOT EXISTS fsp_logo_path text;

CREATE TABLE public.wealth_client_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.wealth_workflows(id) ON DELETE SET NULL,
  owner_user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'invited',
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.wealth_client_invites TO authenticated;
GRANT ALL ON public.wealth_client_invites TO service_role;
ALTER TABLE public.wealth_client_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin reads invites" ON public.wealth_client_invites FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin updates invites" ON public.wealth_client_invites FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Practice logos readable by signed-in users" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'practice-logos');
CREATE POLICY "Owners upload own practice logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'practice-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners update own practice logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'practice-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners delete own practice logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'practice-logos' AND (storage.foldername(name))[1] = auth.uid()::text);