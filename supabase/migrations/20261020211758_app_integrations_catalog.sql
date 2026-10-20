-- App Integrations: global catalog + per-broker encrypted credential vault

CREATE TYPE integration_category AS ENUM ('insurance', 'crm_planning', 'industry_portal');
CREATE TYPE integration_status AS ENUM ('configured', 'pending', 'inactive');

-- 1. Global catalog (managed by Super Admin)
CREATE TABLE app_integrations_catalog (
  id text PRIMARY KEY,                          -- e.g. 'brightrock', 'astute'
  name text NOT NULL,
  category integration_category NOT NULL,
  portal_url text NOT NULL,
  required_fields jsonb NOT NULL DEFAULT '["username", "password"]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_integrations_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read catalog"
  ON app_integrations_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage catalog"
  ON app_integrations_catalog FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. Per-broker credential vault
CREATE TABLE broker_integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id text NOT NULL REFERENCES app_integrations_catalog(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  username text,
  encrypted_credentials text,                   -- AES-256-GCM ciphertext (iv+tag+payload, base64)
  status integration_status NOT NULL DEFAULT 'pending',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broker_user_id, integration_id)
);

ALTER TABLE broker_integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage own credentials"
  ON broker_integration_credentials FOR ALL
  TO authenticated
  USING (broker_user_id = auth.uid())
  WITH CHECK (broker_user_id = auth.uid());

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_catalog_updated_at
  BEFORE UPDATE ON app_integrations_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_credentials_updated_at
  BEFORE UPDATE ON broker_integration_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Seed the 7 providers
INSERT INTO app_integrations_catalog (id, name, category, portal_url, required_fields, display_order) VALUES
  ('brightrock', 'BrightRock', 'insurance', 'https://www.brightrock.co.za', '["username", "password"]', 1),
  ('momentum', 'Momentum', 'insurance', 'https://advisorconnect.momentum.co.za', '["username", "password"]', 2),
  ('bidvest_life', 'Bidvest Life / FMI', 'insurance', 'https://www.advisorfmi.co.za', '["username", "password"]', 3),
  ('old_mutual', 'Old Mutual', 'insurance', 'https://my.oldmutual.co.za', '["username", "password"]', 4),
  ('discovery', 'Discovery', 'insurance', 'https://partner.discovery.co.za/partner/login', '["username", "password"]', 5),
  ('xplan', 'Xplan', 'crm_planning', 'https://mastheadfs.xplan.iris.co.za', '["username", "password"]', 6),
  ('astute', 'Astute FSE', 'industry_portal', 'https://www.astutefse.com', '["username", "password", "pin"]', 7);
