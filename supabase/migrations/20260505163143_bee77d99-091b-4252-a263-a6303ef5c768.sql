-- Enable SOS module globally
INSERT INTO public.app_modules (module_key, enabled)
VALUES ('holarchelp', true)
ON CONFLICT (module_key) DO UPDATE SET enabled = true;

-- Add reminders_enabled to prescriptions
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT true;

-- Admission title for grouping
ALTER TABLE public.hospital_admissions
  ADD COLUMN IF NOT EXISTS title text;

-- Audit-trail-friendly progress notes
CREATE TABLE IF NOT EXISTS public.admission_progress_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  recorded_by uuid,
  recorded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admission_progress_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with admission access can view notes"
ON public.admission_progress_notes FOR SELECT
USING (public.can_access_admission(admission_id));

CREATE POLICY "Users with admission edit access can insert notes"
ON public.admission_progress_notes FOR INSERT
WITH CHECK (public.can_edit_admission(admission_id));

CREATE POLICY "Users can update their own notes"
ON public.admission_progress_notes FOR UPDATE
USING (recorded_by = auth.uid());

CREATE POLICY "Users can delete their own notes"
ON public.admission_progress_notes FOR DELETE
USING (recorded_by = auth.uid());

CREATE TRIGGER update_admission_progress_notes_updated_at
BEFORE UPDATE ON public.admission_progress_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();