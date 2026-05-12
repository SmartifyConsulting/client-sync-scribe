
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS status_changed_at timestamptz NOT NULL DEFAULT now();

UPDATE public.bug_reports SET status = 'Logged', status_changed_at = updated_at WHERE status = 'open';
UPDATE public.bug_reports SET status = 'Closed', status_changed_at = updated_at WHERE status = 'done';

ALTER TABLE public.bug_reports ALTER COLUMN status SET DEFAULT 'Logged';

CREATE OR REPLACE FUNCTION public.bug_reports_touch_status_changed_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at = now();
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bug_reports_touch_status_changed_at ON public.bug_reports;
CREATE TRIGGER bug_reports_touch_status_changed_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.bug_reports_touch_status_changed_at();

DROP POLICY IF EXISTS "Users update own reports or admin updates all" ON public.bug_reports;
CREATE POLICY "Owners edit own (no status), admins edit all"
ON public.bug_reports
FOR UPDATE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role)
  OR (auth.uid() = user_id AND status = (SELECT status FROM public.bug_reports WHERE id = bug_reports.id))
);
