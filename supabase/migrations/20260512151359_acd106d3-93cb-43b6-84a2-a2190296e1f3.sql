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

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();