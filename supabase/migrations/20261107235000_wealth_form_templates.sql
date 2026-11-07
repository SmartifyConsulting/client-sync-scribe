CREATE TABLE IF NOT EXISTS public.wealth_form_templates (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 1000000),
  archived boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, template_key)
);

ALTER TABLE public.wealth_form_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.wealth_form_templates TO authenticated;

DROP POLICY IF EXISTS "Manage own form templates" ON public.wealth_form_templates;
CREATE POLICY "Manage own form templates" ON public.wealth_form_templates
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
