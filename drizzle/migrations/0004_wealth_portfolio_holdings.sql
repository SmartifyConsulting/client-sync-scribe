CREATE TABLE public.wealth_portfolio_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'astute',
  reference text,
  provider text NOT NULL,
  policy_number text NOT NULL,
  product text,
  category text NOT NULL DEFAULT 'life',
  status text,
  premium numeric,
  premium_frequency text,
  start_date date,
  life_cover numeric,
  disability_cover numeric,
  dread_cover numeric,
  asset_value numeric,
  parties text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, source, provider, policy_number)
);
GRANT SELECT ON public.wealth_portfolio_holdings TO authenticated;
GRANT ALL ON public.wealth_portfolio_holdings TO service_role;
ALTER TABLE public.wealth_portfolio_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WM and client read holdings" ON public.wealth_portfolio_holdings
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND (p.user_id = auth.uid() OR p.patient_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE INDEX ON public.wealth_portfolio_holdings(patient_id);