-- Split the combined header_footer_templates concept into two fully
-- independent entities: header_templates and footer_templates. The old
-- table and its seed function are left in place (unused going forward)
-- so this migration is additive and safe to roll back from.

-- 1. New tables --------------------------------------------------------

CREATE TABLE public.header_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  section JSONB DEFAULT '{"left": {"text": "", "alignment": "left"}, "center": {"text": "", "alignment": "center"}, "right": {"text": "", "alignment": "right"}}'::jsonb,
  font_family TEXT DEFAULT 'sans',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.footer_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  section JSONB DEFAULT '{"left": {"text": "", "alignment": "left"}, "center": {"text": "", "alignment": "center"}, "right": {"text": "", "alignment": "right"}}'::jsonb,
  font_family TEXT DEFAULT 'sans',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.header_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own header templates"
  ON public.header_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own header templates"
  ON public.header_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own header templates"
  ON public.header_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own header templates"
  ON public.header_templates FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own footer templates"
  ON public.footer_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own footer templates"
  ON public.footer_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own footer templates"
  ON public.footer_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own footer templates"
  ON public.footer_templates FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_header_templates_updated_at
  BEFORE UPDATE ON public.header_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_footer_templates_updated_at
  BEFORE UPDATE ON public.footer_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. New FK columns on templates ----------------------------------------

ALTER TABLE public.templates
  ADD COLUMN header_template_id UUID REFERENCES public.header_templates(id) ON DELETE SET NULL,
  ADD COLUMN footer_template_id UUID REFERENCES public.footer_templates(id) ON DELETE SET NULL;

-- 3. Split every existing combined letterhead into a header row + a
--    footer row, and repoint any content template that referenced the
--    old combined row at the new pair. -----------------------------------

DO $$
DECLARE
  hf RECORD;
  new_header_id UUID;
  new_footer_id UUID;
BEGIN
  FOR hf IN SELECT * FROM public.header_footer_templates LOOP
    INSERT INTO public.header_templates (user_id, name, description, section, font_family, is_default)
    VALUES (hf.user_id, hf.name, hf.description, hf.header, hf.font_family, hf.is_default)
    RETURNING id INTO new_header_id;

    INSERT INTO public.footer_templates (user_id, name, description, section, font_family, is_default)
    VALUES (hf.user_id, hf.name, hf.description, hf.footer, hf.font_family, hf.is_default)
    RETURNING id INTO new_footer_id;

    UPDATE public.templates
    SET header_template_id = new_header_id,
        footer_template_id = new_footer_id
    WHERE header_footer_template_id = hf.id;
  END LOOP;
END $$;

-- 4. Seed functions for new users, mirroring the old combined seed ------

CREATE OR REPLACE FUNCTION public.seed_default_header_template(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.header_templates WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.header_templates (user_id, name, description, section, font_family, is_default)
  VALUES (
    _user_id,
    'Header Template',
    'Default practice header — replace each "Insert Data here" placeholder with your real details.',
    jsonb_build_object(
      'left', jsonb_build_object(
        'alignment', 'left',
        'text', E'<b>Dr. [Insert Data here]:</b> MP [Insert Data here]\n[Cell: Insert Data here]'
      ),
      'center', jsonb_build_object(
        'alignment', 'center',
        'text', E'<b>[INSERT PRACTICE NAME]</b>\n<b>ADDRESS:</b> Insert Data here\nInsert Data here\nInsert Data here\nInsert Data here\n'
      ),
      'right', jsonb_build_object(
        'alignment', 'right',
        'text', E'<b>CONTACT DETAILS:</b>\nPractice Contact Number: Insert Data here\n'
      )
    ),
    'sans',
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_default_footer_template(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.footer_templates WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.footer_templates (user_id, name, description, section, font_family, is_default)
  VALUES (
    _user_id,
    'Footer Template',
    'Default practice footer — replace each "Insert Data here" placeholder with your real details.',
    jsonb_build_object(
      'left',   jsonb_build_object('alignment', 'left', 'text', ''),
      'center', jsonb_build_object('alignment', 'center', 'text', E'<b>REGISTRATION NO.:  Insert Data here</b>\n'),
      'right',  jsonb_build_object('alignment', 'right', 'text', '')
    ),
    'sans',
    true
  );
END;
$$;

-- 5. Wire the new seed functions into the new-user trigger, in addition
--    to the existing combined seed (kept for anything still reading it). --

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_name_parts text[];
  v_first_name text;
  v_last_name text;
  v_base_alias text;
  v_alias text;
  v_counter int := 0;
  v_role_text text;
  v_role public.user_role;
BEGIN
  v_full_name := lower(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')));

  IF v_full_name = '' THEN
    v_full_name := split_part(new.email, '@', 1);
  END IF;

  v_name_parts := string_to_array(regexp_replace(v_full_name, '\s+', ' ', 'g'), ' ');
  v_first_name := v_name_parts[1];
  v_last_name := CASE WHEN array_length(v_name_parts, 1) > 1 THEN v_name_parts[array_length(v_name_parts, 1)] ELSE '' END;

  IF v_last_name <> '' THEN
    v_base_alias := regexp_replace(v_first_name || '-' || v_last_name, '[^a-z0-9-]', '', 'g');
  ELSE
    v_base_alias := regexp_replace(v_first_name, '[^a-z0-9-]', '', 'g');
  END IF;

  v_alias := v_base_alias;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE mailbox_alias = v_alias);
    v_counter := v_counter + 1;
    v_alias := v_base_alias || '-' || v_counter;
  END LOOP;

  v_role_text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'doctor'));
  IF v_role_text NOT IN ('doctor','patient','admin') THEN
    v_role_text := 'doctor';
  END IF;
  v_role := v_role_text::public.user_role;

  INSERT INTO public.profiles (id, full_name, mailbox_alias, role)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', v_alias, v_role)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, v_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'doctor'::public.user_role THEN
    PERFORM public.seed_default_header_template(new.id);
    PERFORM public.seed_default_footer_template(new.id);
  END IF;

  RETURN new;
END;
$function$;

-- 6. Backfill: every existing doctor with no header/footer template yet
--    gets the generic defaults (covers doctors created before this
--    migration whose combined letterhead — if any — was already split
--    above, and any doctor with no letterhead at all).

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.header_templates h ON h.user_id = p.id
    WHERE p.role = 'doctor'::public.user_role
      AND h.id IS NULL
  LOOP
    PERFORM public.seed_default_header_template(r.id);
  END LOOP;

  FOR r IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.footer_templates f ON f.user_id = p.id
    WHERE p.role = 'doctor'::public.user_role
      AND f.id IS NULL
  LOOP
    PERFORM public.seed_default_footer_template(r.id);
  END LOOP;
END $$;
