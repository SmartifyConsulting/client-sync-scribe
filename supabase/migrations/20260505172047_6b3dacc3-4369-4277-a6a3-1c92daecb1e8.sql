CREATE OR REPLACE VIEW public.doctor_busy_slots
WITH (security_invoker = true)
AS
SELECT
  user_id AS doctor_id,
  start_time,
  end_time
FROM public.appointments;

GRANT SELECT ON public.doctor_busy_slots TO authenticated, anon;

-- Allow any authenticated user to read busy time windows of any doctor (start/end + doctor_id only via the view).
DROP POLICY IF EXISTS "Authenticated can see appointment time windows" ON public.appointments;
CREATE POLICY "Authenticated can see appointment time windows"
ON public.appointments
FOR SELECT
TO authenticated
USING (true);