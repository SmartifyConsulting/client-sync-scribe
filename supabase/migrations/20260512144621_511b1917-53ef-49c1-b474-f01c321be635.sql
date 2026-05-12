ALTER TABLE public.holarchelp_emergency_contacts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS personal_info_ref text NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.holarchelp_emergency_contacts
  DROP CONSTRAINT IF EXISTS holarchelp_emergency_contacts_source_check;

ALTER TABLE public.holarchelp_emergency_contacts
  ADD CONSTRAINT holarchelp_emergency_contacts_source_check
  CHECK (source IN ('manual','personal_info_seed'));

CREATE UNIQUE INDEX IF NOT EXISTS holarchelp_emergency_contacts_user_ref_uniq
  ON public.holarchelp_emergency_contacts (user_id, personal_info_ref)
  WHERE personal_info_ref IS NOT NULL;

DROP TRIGGER IF EXISTS holarchelp_emergency_contacts_set_updated_at
  ON public.holarchelp_emergency_contacts;

CREATE TRIGGER holarchelp_emergency_contacts_set_updated_at
  BEFORE UPDATE ON public.holarchelp_emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();