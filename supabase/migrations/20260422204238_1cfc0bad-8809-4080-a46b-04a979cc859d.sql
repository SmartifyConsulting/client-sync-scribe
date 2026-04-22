-- Add intake method + baseline pattern summary to pill references
ALTER TABLE public.prescription_pill_references
  ADD COLUMN IF NOT EXISTS intake_method text,
  ADD COLUMN IF NOT EXISTS baseline_pattern_summary text;

-- Extend stale trigger to also clear the new columns when medication or dosage changes
CREATE OR REPLACE FUNCTION public.mark_pill_reference_stale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.medication IS DISTINCT FROM OLD.medication)
     OR (NEW.dosage IS DISTINCT FROM OLD.dosage) THEN
    UPDATE public.prescription_pill_references
    SET observed_description = NULL,
        intake_method = NULL,
        baseline_pattern_summary = NULL,
        updated_at = now()
    WHERE prescription_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Add confidence + reconciliation columns to medication_adherence
ALTER TABLE public.medication_adherence
  ADD COLUMN IF NOT EXISTS confidence_score numeric,
  ADD COLUMN IF NOT EXISTS auto_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciliation_note text;

-- Index to speed up monthly reconciliation queries
CREATE INDEX IF NOT EXISTS idx_medication_adherence_status_date
  ON public.medication_adherence(status, scheduled_date);
