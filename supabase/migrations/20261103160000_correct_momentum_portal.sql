-- Correct the public Momentum AdviserConnect entry point; never store a session-specific Auth0 URL.
UPDATE public.app_integrations_catalog
SET portal_url = 'https://adviserconnect.momentum.co.za'
WHERE name = 'Momentum' AND portal_url = 'https://advisorconnect.momentum.co.za';