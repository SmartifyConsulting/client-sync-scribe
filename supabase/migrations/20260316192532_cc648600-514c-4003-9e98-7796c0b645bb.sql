
-- Update handle_new_user to auto-generate mailbox_alias from full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_name_parts text[];
  v_first_name text;
  v_last_name text;
  v_base_alias text;
  v_alias text;
  v_counter int := 0;
BEGIN
  v_full_name := lower(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')));
  
  IF v_full_name = '' THEN
    v_full_name := split_part(new.email, '@', 1);
  END IF;
  
  -- Split name into parts
  v_name_parts := string_to_array(regexp_replace(v_full_name, '\s+', ' ', 'g'), ' ');
  v_first_name := v_name_parts[1];
  v_last_name := CASE WHEN array_length(v_name_parts, 1) > 1 THEN v_name_parts[array_length(v_name_parts, 1)] ELSE '' END;
  
  -- Build base alias: firstname-lastname (no year for now, year of birth added client-side if available)
  IF v_last_name != '' THEN
    v_base_alias := regexp_replace(v_first_name || '-' || v_last_name, '[^a-z0-9-]', '', 'g');
  ELSE
    v_base_alias := regexp_replace(v_first_name, '[^a-z0-9-]', '', 'g');
  END IF;
  
  -- Ensure uniqueness by appending a counter if needed
  v_alias := v_base_alias;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE mailbox_alias = v_alias);
    v_counter := v_counter + 1;
    v_alias := v_base_alias || '-' || v_counter;
  END LOOP;
  
  INSERT INTO public.profiles (id, full_name, mailbox_alias)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', v_alias);
  RETURN new;
END;
$$;
