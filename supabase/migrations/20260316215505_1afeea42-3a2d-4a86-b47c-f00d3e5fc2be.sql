
CREATE TABLE public.moola_partner_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moola_partner_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active partner apps" ON public.moola_partner_apps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage partner apps" ON public.moola_partner_apps FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE TABLE public.moola_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_app_id uuid NOT NULL REFERENCES public.moola_partner_apps(id),
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moola_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transfers" ON public.moola_transfers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create transfers" ON public.moola_transfers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
