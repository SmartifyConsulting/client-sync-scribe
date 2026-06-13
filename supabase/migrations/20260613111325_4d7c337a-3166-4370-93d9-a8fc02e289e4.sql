
-- 1) Patient-hidden doctors
CREATE TABLE public.patient_hidden_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, doctor_id)
);

GRANT SELECT, INSERT, DELETE ON public.patient_hidden_doctors TO authenticated;
GRANT ALL ON public.patient_hidden_doctors TO service_role;

ALTER TABLE public.patient_hidden_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient manages own hidden doctors"
  ON public.patient_hidden_doctors
  FOR ALL
  TO authenticated
  USING (patient_user_id = auth.uid())
  WITH CHECK (patient_user_id = auth.uid());

-- 2) Prescription renewal requests
CREATE TABLE public.prescription_renewal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL,
  requested_doctor_id uuid NOT NULL,
  original_doctor_id uuid,
  todo_id uuid,
  status text NOT NULL DEFAULT 'pending',
  patient_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX prr_prescription_idx ON public.prescription_renewal_requests(prescription_id);
CREATE INDEX prr_patient_idx ON public.prescription_renewal_requests(patient_user_id);
CREATE INDEX prr_requested_doctor_idx ON public.prescription_renewal_requests(requested_doctor_id);

GRANT SELECT, INSERT, UPDATE ON public.prescription_renewal_requests TO authenticated;
GRANT ALL ON public.prescription_renewal_requests TO service_role;

ALTER TABLE public.prescription_renewal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient can view own renewal requests"
  ON public.prescription_renewal_requests
  FOR SELECT
  TO authenticated
  USING (patient_user_id = auth.uid());

CREATE POLICY "Patient can insert own renewal requests"
  ON public.prescription_renewal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Patient can update own renewal requests"
  ON public.prescription_renewal_requests
  FOR UPDATE
  TO authenticated
  USING (patient_user_id = auth.uid())
  WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Requested doctor can view renewal requests"
  ON public.prescription_renewal_requests
  FOR SELECT
  TO authenticated
  USING (requested_doctor_id = auth.uid());

CREATE POLICY "Requested doctor can update renewal requests"
  ON public.prescription_renewal_requests
  FOR UPDATE
  TO authenticated
  USING (requested_doctor_id = auth.uid())
  WITH CHECK (requested_doctor_id = auth.uid());

CREATE POLICY "Admins can view all renewal requests"
  ON public.prescription_renewal_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE TRIGGER prescription_renewal_requests_set_updated_at
  BEFORE UPDATE ON public.prescription_renewal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
