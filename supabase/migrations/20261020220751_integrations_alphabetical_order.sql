-- Re-sequence providers alphabetically by name within each category.
UPDATE app_integrations_catalog SET display_order = 1 WHERE id = 'bidvest_life';
UPDATE app_integrations_catalog SET display_order = 2 WHERE id = 'brightrock';
UPDATE app_integrations_catalog SET display_order = 3 WHERE id = 'discovery';
UPDATE app_integrations_catalog SET display_order = 4 WHERE id = 'momentum';
UPDATE app_integrations_catalog SET display_order = 5 WHERE id = 'old_mutual';
