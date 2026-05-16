CREATE TABLE public.doctor_hospital_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  hospital_id uuid REFERENCES public.holarchelp_hospitals(id) ON DELETE SET NULL,
  hospital_name_snapshot text,
  role_at_hospital text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dha_doctor ON public.doctor_hospital_affiliations(doctor_id);
CREATE INDEX idx_dha_hospital ON public.doctor_hospital_affiliations(hospital_id);

ALTER TABLE public.doctor_hospital_affiliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own affiliations"
ON public.doctor_hospital_affiliations
FOR ALL
USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Hospital staff view own hospital affiliations"
ON public.doctor_hospital_affiliations
FOR SELECT
USING (hospital_id IS NOT NULL AND public.is_hospital_staff(hospital_id, auth.uid()));

CREATE POLICY "Admins full access affiliations"
ON public.doctor_hospital_affiliations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE TRIGGER trg_dha_updated_at
BEFORE UPDATE ON public.doctor_hospital_affiliations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();