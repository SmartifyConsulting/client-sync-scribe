-- Move the existing Masthead row into the new Financial Service Providers
-- category, and seed the two new providers. Portal URLs for the new ones
-- are left blank — fill in via /admin/integrations.
UPDATE app_integrations_catalog
SET category = 'financial_service_provider', display_order = 1
WHERE id = 'masthead';

INSERT INTO app_integrations_catalog (id, name, category, portal_url, required_fields, display_order) VALUES
  ('hampshire', 'Hampshire', 'financial_service_provider', '', '["username", "password"]', 2),
  ('psg_wealth', 'PSG Wealth', 'financial_service_provider', '', '["username", "password"]', 3);
