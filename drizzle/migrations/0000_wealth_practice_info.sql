CREATE TABLE public.wealth_practice_info (
  user_id uuid PRIMARY KEY,
  title text, planner_name text, id_number text, postal_address text, phone text,
  email_primary text, email_secondary text, planner_status text,
  qualification text, experience_years integer,
  fsca_categories text[] NOT NULL DEFAULT '{}', pi_cover boolean,
  fsp_name text, fsp_legal_status text, fsb_licence text, registration_number text,
  firm_phone text, firm_address text, firm_website text, directors text,
  conflict_policy text,
  compliance_officer text, compliance_phone text, compliance_fax text, compliance_email text,
  complaints_address text,
  product_suppliers jsonb NOT NULL DEFAULT '{"short_term":[],"life":[],"investments":[],"health":[]}',
  remuneration_basis text, shareholding_statement text,
  top_suppliers jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wealth_practice_info TO authenticated;
GRANT ALL ON public.wealth_practice_info TO service_role;
ALTER TABLE public.wealth_practice_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages practice info" ON public.wealth_practice_info FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Signed-in users can read practice info" ON public.wealth_practice_info FOR SELECT TO authenticated USING (true);
CREATE TRIGGER wpi_touch BEFORE UPDATE ON public.wealth_practice_info FOR EACH ROW EXECUTE FUNCTION public.cfp_touch();