-- Split the single "Letterhead" link on templates into independent Header
-- and Footer template links, so a content template can mix a header from
-- one letterhead with a footer from another. Existing rows are backfilled
-- from the old combined header_footer_template_id so nothing changes for
-- templates that haven't been touched yet.

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS header_template_id uuid REFERENCES public.header_footer_templates(id),
  ADD COLUMN IF NOT EXISTS footer_template_id uuid REFERENCES public.header_footer_templates(id);

UPDATE public.templates
SET
  header_template_id = COALESCE(header_template_id, header_footer_template_id),
  footer_template_id = COALESCE(footer_template_id, header_footer_template_id)
WHERE header_footer_template_id IS NOT NULL;
