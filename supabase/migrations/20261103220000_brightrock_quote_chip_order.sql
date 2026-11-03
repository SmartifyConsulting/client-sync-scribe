-- BrightRock follows the existing four insurer choices in the quote selector.
UPDATE public.app_integrations_catalog
SET display_order = 6
WHERE id = 'brightrock' AND category = 'insurance';