CREATE OR REPLACE FUNCTION public.get_patient_document_alias(_patient_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.mailbox_alias
  FROM public.patients p
  JOIN public.profiles pr
    ON pr.id = COALESCE(p.patient_user_id, p.user_id)
  WHERE p.id = _patient_id
    AND public.user_can_access_patient_rt(_patient_id)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_document_alias(uuid) TO authenticated;