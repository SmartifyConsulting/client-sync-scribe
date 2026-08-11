-- 1. Seed the standard letterhead for template owners with no letterhead
INSERT INTO public.header_footer_templates (user_id, name, description, header, footer, font_family, is_default)
SELECT DISTINCT t.user_id,
  'Header and Footer',
  NULL,
  '{"left": {"text": "<b>Dr. [Insert Data here]:</b> MP [Insert Data here]\n[Cell: Insert Data here]", "alignment": "left"}, "center": {"text": "<b>[INSERT PRACTICE NAME]</b>\n<b>ADDRESS:</b> Insert Data here", "alignment": "center"}, "right": {"text": "<b>CONTACT DETAILS:</b>\nPractice Contact Number: Insert Data here", "alignment": "right"}}'::jsonb,
  '{"left": {"text": "", "alignment": "left"}, "center": {"text": "<b>REGISTRATION NO.:  Insert Data here</b>", "alignment": "center"}, "right": {"text": "", "alignment": "right"}}'::jsonb,
  'sans',
  true
FROM public.templates t
WHERE NOT EXISTS (
  SELECT 1 FROM public.header_footer_templates h WHERE h.user_id = t.user_id
);

-- 2. Dedupe templates: keep oldest per (user_id, name)
WITH ranked AS (
  SELECT id, user_id, name,
         first_value(id) OVER (PARTITION BY user_id, name ORDER BY created_at, id) AS keep_id
  FROM public.templates
)
UPDATE public.documents d
SET template_id = r.keep_id
FROM ranked r
WHERE d.template_id = r.id AND r.id <> r.keep_id;

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (PARTITION BY user_id, name ORDER BY created_at, id) AS keep_id
  FROM public.templates
)
DELETE FROM public.templates t
USING ranked r
WHERE t.id = r.id AND r.id <> r.keep_id;

-- 3. Attach default letterhead where none selected
WITH def AS (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.header_footer_templates
  ORDER BY user_id, is_default DESC NULLS LAST, created_at
)
UPDATE public.templates t
SET header_template_id = COALESCE(t.header_template_id, def.id),
    footer_template_id = COALESCE(t.footer_template_id, def.id)
FROM def
WHERE def.user_id = t.user_id
  AND (t.header_template_id IS NULL OR t.footer_template_id IS NULL);

-- 4. Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS templates_user_name_key ON public.templates (user_id, name);