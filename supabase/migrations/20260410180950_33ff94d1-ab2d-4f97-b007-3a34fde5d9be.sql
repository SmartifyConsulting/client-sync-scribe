-- Add app store URL columns to moola_partner_apps
ALTER TABLE public.moola_partner_apps
  ADD COLUMN google_play_url text,
  ADD COLUMN app_store_url text;

-- Create adherence rewards config table
CREATE TABLE public.moola_adherence_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_category text NOT NULL,
  lollipops_awarded integer NOT NULL DEFAULT 1,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.moola_adherence_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view adherence configs"
  ON public.moola_adherence_configs FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert adherence configs"
  ON public.moola_adherence_configs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update adherence configs"
  ON public.moola_adherence_configs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete adherence configs"
  ON public.moola_adherence_configs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_moola_adherence_configs_updated_at
  BEFORE UPDATE ON public.moola_adherence_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();