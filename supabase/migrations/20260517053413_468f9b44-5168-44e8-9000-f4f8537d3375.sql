
-- 1. Ambulance ↔ hospital affiliations
CREATE TABLE public.ambulance_hospital_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambulance_provider_id uuid NOT NULL REFERENCES public.holarchelp_ambulance_providers(id) ON DELETE CASCADE,
  hospital_id uuid REFERENCES public.holarchelp_hospitals(id) ON DELETE SET NULL,
  hospital_name_snapshot text,
  role text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aha_amb ON public.ambulance_hospital_affiliations(ambulance_provider_id);
CREATE INDEX idx_aha_hospital ON public.ambulance_hospital_affiliations(hospital_id);

ALTER TABLE public.ambulance_hospital_affiliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambulance staff manage own affiliations"
ON public.ambulance_hospital_affiliations
FOR ALL
USING (public.is_ambulance_staff(ambulance_provider_id, auth.uid()))
WITH CHECK (public.is_ambulance_staff(ambulance_provider_id, auth.uid()));

CREATE POLICY "Hospital staff view affiliations for their hospital"
ON public.ambulance_hospital_affiliations
FOR SELECT
USING (hospital_id IS NOT NULL AND public.is_hospital_staff(hospital_id, auth.uid()));

CREATE POLICY "Admins full access ambulance affiliations"
ON public.ambulance_hospital_affiliations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE TRIGGER trg_aha_updated_at
BEFORE UPDATE ON public.ambulance_hospital_affiliations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Pending import payload column on doctor affiliations
ALTER TABLE public.doctor_hospital_affiliations
  ADD COLUMN IF NOT EXISTS pending_doctor_payload jsonb;

-- Make doctor_id nullable so import can create pending rows without a matched doctor.
ALTER TABLE public.doctor_hospital_affiliations
  ALTER COLUMN doctor_id DROP NOT NULL;

-- Index for matching by email / practice number on link-on-signup
CREATE INDEX IF NOT EXISTS idx_dha_pending_practice
  ON public.doctor_hospital_affiliations ((pending_doctor_payload->>'practice_number'))
  WHERE doctor_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_dha_pending_email
  ON public.doctor_hospital_affiliations ((lower(pending_doctor_payload->>'email')))
  WHERE doctor_id IS NULL;

-- Allow hospital staff to insert pending rows for their hospital (imports)
CREATE POLICY "Hospital staff create affiliations for their hospital"
ON public.doctor_hospital_affiliations
FOR INSERT
WITH CHECK (
  hospital_id IS NOT NULL
  AND public.is_hospital_staff(hospital_id, auth.uid())
);

CREATE POLICY "Hospital staff update pending affiliations for their hospital"
ON public.doctor_hospital_affiliations
FOR UPDATE
USING (
  hospital_id IS NOT NULL
  AND public.is_hospital_staff(hospital_id, auth.uid())
);

CREATE POLICY "Hospital staff delete pending affiliations for their hospital"
ON public.doctor_hospital_affiliations
FOR DELETE
USING (
  hospital_id IS NOT NULL
  AND public.is_hospital_staff(hospital_id, auth.uid())
  AND doctor_id IS NULL
);

-- 3. Link-on-signup: when a profile gets a practice number, link any pending rows
CREATE OR REPLACE FUNCTION public.link_pending_doctor_affiliations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.id;

  UPDATE public.doctor_hospital_affiliations dha
    SET doctor_id = NEW.id,
        status = 'active',
        updated_at = now()
    WHERE dha.doctor_id IS NULL
      AND (
        (NEW.practice_number IS NOT NULL AND dha.pending_doctor_payload->>'practice_number' = NEW.practice_number)
        OR (_email IS NOT NULL AND lower(dha.pending_doctor_payload->>'email') = lower(_email))
      );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_pending_aff_insert ON public.profiles;
CREATE TRIGGER trg_link_pending_aff_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.link_pending_doctor_affiliations();

DROP TRIGGER IF EXISTS trg_link_pending_aff_update ON public.profiles;
CREATE TRIGGER trg_link_pending_aff_update
AFTER UPDATE OF practice_number ON public.profiles
FOR EACH ROW
WHEN (NEW.practice_number IS DISTINCT FROM OLD.practice_number)
EXECUTE FUNCTION public.link_pending_doctor_affiliations();
