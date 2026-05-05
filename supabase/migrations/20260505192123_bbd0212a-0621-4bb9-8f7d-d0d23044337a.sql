
ALTER TABLE public.pricing_config DROP CONSTRAINT IF EXISTS pricing_config_role_check;
ALTER TABLE public.pricing_config ADD CONSTRAINT pricing_config_role_check
  CHECK (role IN ('doctor','patient','emergency'));

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('doctor','patient','emergency'));

INSERT INTO public.pricing_config (role, billing_cycle, price, name, savings)
VALUES
  ('emergency', 'monthly', 19.99, 'Emergency Services Monthly', 0),
  ('emergency', 'annual', 199.99, 'Emergency Services Annual', 39.89)
ON CONFLICT (role, billing_cycle) DO NOTHING;
