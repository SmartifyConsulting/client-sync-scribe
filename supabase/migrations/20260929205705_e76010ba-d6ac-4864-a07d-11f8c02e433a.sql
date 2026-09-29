ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS payfast_token text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS pricing_id uuid;
ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS payfast_payment_id text,
  ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.pricing_config ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
CREATE UNIQUE INDEX IF NOT EXISTS payment_history_payfast_pid ON public.payment_history(payfast_payment_id) WHERE payfast_payment_id IS NOT NULL;