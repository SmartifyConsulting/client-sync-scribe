
CREATE OR REPLACE FUNCTION public.can_access_patient_clinical(_patient_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _patient_user_id IS NOT NULL AND (
    _patient_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doctor_patient_access dpa
      WHERE dpa.patient_user_id = _patient_user_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
        AND dpa.revoked_at IS NULL
    )
    OR public.has_role(auth.uid(), 'admin')
  );
$$;

-- Patient clinical tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['patient_allergies','patient_current_medications','patient_imaging','patient_lab_results','patient_medical_history']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY "Care circle can view %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.can_access_patient_clinical(patient_user_id))$p$, t);
    EXECUTE format($p$CREATE POLICY "Care circle can insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.can_access_patient_clinical(patient_user_id))$p$, t);
    EXECUTE format($p$CREATE POLICY "Care circle can update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.can_access_patient_clinical(patient_user_id)) WITH CHECK (public.can_access_patient_clinical(patient_user_id))$p$, t);
    EXECUTE format($p$CREATE POLICY "Care circle can delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.can_access_patient_clinical(patient_user_id))$p$, t);
  END LOOP;
END $$;

-- Reference table
REVOKE ALL ON public.drug_interactions FROM anon;
GRANT SELECT ON public.drug_interactions TO authenticated;
GRANT ALL ON public.drug_interactions TO service_role;
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read drug interactions" ON public.drug_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage drug interactions" ON public.drug_interactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
