UPDATE public.app_integrations_catalog
SET portal_url = 'https://mastheadfs.xplan.iress.co.za/'
WHERE id = 'xplan' AND rtrim(portal_url, '/') = 'https://mastheadfs.xplan.iris.co.za';

UPDATE public.app_integrations_catalog
SET portal_url = 'https://aol.astutefse.com/online'
WHERE id = 'astute' AND rtrim(portal_url, '/') IN ('https://www.astutefse.com', 'https://astutefse.com');
