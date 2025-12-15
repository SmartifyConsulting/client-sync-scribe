-- Create pricing_config table to store subscription pricing
CREATE TABLE public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('doctor', 'patient')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  price numeric NOT NULL,
  name text NOT NULL,
  savings numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (role, billing_cycle)
);

-- Enable RLS
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Create policies - anyone can read pricing, only admins can modify
CREATE POLICY "Anyone can view pricing"
ON public.pricing_config
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert pricing"
ON public.pricing_config
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pricing"
ON public.pricing_config
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pricing"
ON public.pricing_config
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default pricing
INSERT INTO public.pricing_config (role, billing_cycle, price, name, savings) VALUES
  ('doctor', 'monthly', 49.99, 'Doctor Monthly', 0),
  ('doctor', 'annual', 499.99, 'Doctor Annual', 100),
  ('patient', 'monthly', 9.99, 'Patient Monthly', 0),
  ('patient', 'annual', 99.99, 'Patient Annual', 20);

-- Create trigger for updated_at
CREATE TRIGGER update_pricing_config_updated_at
BEFORE UPDATE ON public.pricing_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();