CREATE TABLE public.holarc_health_links (
  patient_id uuid PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  request_id text,
  remote_patient_id text,
  status text NOT NULL DEFAULT 'none',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  synced_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.holarc_health_links TO authenticated;
GRANT ALL ON public.holarc_health_links TO service_role;
ALTER TABLE public.holarc_health_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read health link" ON public.holarc_health_links FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND (p.user_id = auth.uid() OR p.patient_user_id = auth.uid())));