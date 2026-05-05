-- Disable HolarcHelp module globally
INSERT INTO public.app_modules (module_key, enabled) VALUES ('holarchelp', false)
ON CONFLICT (module_key) DO UPDATE SET enabled = false;

-- Extend moola_partner_apps with sync metadata
ALTER TABLE public.moola_partner_apps
  ADD COLUMN IF NOT EXISTS partner_code text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS moola_partner_apps_partner_code_key
  ON public.moola_partner_apps (partner_code) WHERE partner_code IS NOT NULL;