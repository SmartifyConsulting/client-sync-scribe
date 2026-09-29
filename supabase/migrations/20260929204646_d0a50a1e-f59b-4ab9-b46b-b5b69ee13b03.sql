ALTER TABLE public.wealth_applications ADD COLUMN IF NOT EXISTS monthly_premium numeric, ADD COLUMN IF NOT EXISTS commission_amount numeric;

CREATE TABLE public.wealth_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  annual_policies_target integer NOT NULL DEFAULT 0,
  annual_premium_target numeric NOT NULL DEFAULT 0,
  annual_commission_target numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_targets TO authenticated;
GRANT ALL ON public.wealth_targets TO service_role;
ALTER TABLE public.wealth_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own targets" ON public.wealth_targets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);