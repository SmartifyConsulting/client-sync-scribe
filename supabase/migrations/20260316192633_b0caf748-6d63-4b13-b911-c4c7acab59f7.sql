
-- Backfill mailbox_alias for existing profiles that don't have one
DO $$
DECLARE
  r RECORD;
  v_name_parts text[];
  v_first_name text;
  v_last_name text;
  v_base_alias text;
  v_alias text;
  v_counter int;
BEGIN
  FOR r IN SELECT id, full_name FROM public.profiles WHERE mailbox_alias IS NULL OR mailbox_alias = '' LOOP
    v_name_parts := string_to_array(regexp_replace(lower(trim(coalesce(r.full_name, 'user'))), '\s+', ' ', 'g'), ' ');
    v_first_name := v_name_parts[1];
    v_last_name := CASE WHEN array_length(v_name_parts, 1) > 1 THEN v_name_parts[array_length(v_name_parts, 1)] ELSE '' END;
    
    IF v_last_name != '' THEN
      v_base_alias := regexp_replace(v_first_name || '-' || v_last_name, '[^a-z0-9-]', '', 'g');
    ELSE
      v_base_alias := regexp_replace(v_first_name, '[^a-z0-9-]', '', 'g');
    END IF;
    
    v_alias := v_base_alias;
    v_counter := 0;
    LOOP
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE mailbox_alias = v_alias);
      v_counter := v_counter + 1;
      v_alias := v_base_alias || '-' || v_counter;
    END LOOP;
    
    UPDATE public.profiles SET mailbox_alias = v_alias WHERE id = r.id;
  END LOOP;
END;
$$;
