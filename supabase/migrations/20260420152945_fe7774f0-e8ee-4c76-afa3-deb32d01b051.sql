UPDATE public.header_footer_templates hf
SET is_default = true
WHERE NOT COALESCE(hf.is_default, false)
  AND (
    SELECT count(*) FROM public.header_footer_templates h2
    WHERE h2.user_id = hf.user_id
  ) = 1;