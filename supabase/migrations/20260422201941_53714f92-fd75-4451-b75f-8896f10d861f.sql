-- Create the pill references table
CREATE TABLE public.prescription_pill_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL UNIQUE REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  reference_image_url TEXT NOT NULL,
  observed_description TEXT,
  medication_snapshot TEXT NOT NULL,
  dosage_snapshot TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pill_refs_prescription ON public.prescription_pill_references(prescription_id);
CREATE INDEX idx_pill_refs_patient ON public.prescription_pill_references(patient_id);

ALTER TABLE public.prescription_pill_references ENABLE ROW LEVEL SECURITY;

-- Patients can view their own references
CREATE POLICY "Patients can view their pill references"
ON public.prescription_pill_references FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescription_pill_references.patient_id
      AND p.patient_user_id = auth.uid()
  )
);

-- Patients can insert their own references
CREATE POLICY "Patients can create their pill references"
ON public.prescription_pill_references FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescription_pill_references.patient_id
      AND p.patient_user_id = auth.uid()
  )
);

-- Patients can update their own references
CREATE POLICY "Patients can update their pill references"
ON public.prescription_pill_references FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescription_pill_references.patient_id
      AND p.patient_user_id = auth.uid()
  )
);

-- Patients can delete their own references
CREATE POLICY "Patients can delete their pill references"
ON public.prescription_pill_references FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescription_pill_references.patient_id
      AND p.patient_user_id = auth.uid()
  )
);

-- Doctors with active access can view
CREATE POLICY "Doctors with access can view pill references"
ON public.prescription_pill_references FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
    WHERE p.id = prescription_pill_references.patient_id
      AND dpa.doctor_id = auth.uid()
      AND dpa.is_active = true
  )
);

-- Trigger to keep updated_at fresh
CREATE TRIGGER update_pill_refs_updated_at
BEFORE UPDATE ON public.prescription_pill_references
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to mark reference stale when prescription medication/dosage changes
CREATE OR REPLACE FUNCTION public.mark_pill_reference_stale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.medication IS DISTINCT FROM OLD.medication)
     OR (NEW.dosage IS DISTINCT FROM OLD.dosage) THEN
    UPDATE public.prescription_pill_references
    SET observed_description = NULL,
        updated_at = now()
    WHERE prescription_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_pill_reference_stale
AFTER UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.mark_pill_reference_stale();