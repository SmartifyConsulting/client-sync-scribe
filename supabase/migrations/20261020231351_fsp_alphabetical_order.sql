-- Re-sequence Financial Service Providers alphabetically by name.
UPDATE app_integrations_catalog SET display_order = 1 WHERE id = 'hampshire';
UPDATE app_integrations_catalog SET display_order = 2 WHERE id = 'masthead';
UPDATE app_integrations_catalog SET display_order = 3 WHERE id = 'psg_wealth';
