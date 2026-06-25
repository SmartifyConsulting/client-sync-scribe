
CREATE OR REPLACE FUNCTION public.create_doctor_invite_notification(
  _doctor_id uuid,
  _title text,
  _description text,
  _reference_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient uuid := auth.uid();
BEGIN
  IF _patient IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only allow inserting notification for a doctor the patient has a request to
  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_access_requests dar
    WHERE dar.patient_user_id = _patient
  ) THEN
    RAISE EXCEPTION 'No access request found';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, description, reference_id, is_read)
  VALUES (_doctor_id, 'access_request', _title, _description, _reference_id, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_doctor_invite_notification(uuid, text, text, uuid) TO authenticated;
