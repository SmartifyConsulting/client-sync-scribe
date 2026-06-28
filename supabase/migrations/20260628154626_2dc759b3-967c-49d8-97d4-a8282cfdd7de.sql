-- Part 1: Generic header/footer template for all doctors

CREATE OR REPLACE FUNCTION public.seed_default_header_footer_template(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.header_footer_templates WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.header_footer_templates (
    user_id, name, description, header, footer, font_family, is_default
  ) VALUES (
    _user_id,
    'Header and Footer',
    'Default practice letterhead — replace each "Insert Data here" placeholder with your real details.',
    jsonb_build_object(
      'left', jsonb_build_object(
        'alignment', 'left',
        'text', E'<b>Dr. [Insert Data here]:</b> MP [Insert Data here]\n[Cell: Insert Data here]\n<b>Dr. [Insert Data here]:</b> MP [Insert Data here]\n[Cell: Insert Data here]\n<b>Dr. [Insert Data here]:</b> MP [Insert Data here]\n[Cell: Insert Data here]\n<b>Dr. [Insert Data here]:</b> MP [Insert Data here]\n[Cell: Insert Data here]'
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
    jsonb_build_object(
      'left',   jsonb_build_object('alignment','left','text',''),
      'center', jsonb_build_object('alignment','center','text', E'<b>REGISTRATION NO.:  Insert Data here</b>\n'),
      'right',  jsonb_build_object('alignment','right','text','')
    ),
    'sans',
    true
  );
END;
$$;

-- Wire into the existing new-user trigger
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
    PERFORM public.seed_default_header_footer_template(new.id);
  END IF;

  RETURN new;
END;
$function$;

-- Backfill: every existing doctor with no template gets the generic one
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.header_footer_templates h ON h.user_id = p.id
    WHERE p.role = 'doctor'::public.user_role
      AND h.id IS NULL
  LOOP
    PERFORM public.seed_default_header_footer_template(r.id);
  END LOOP;
END $$;