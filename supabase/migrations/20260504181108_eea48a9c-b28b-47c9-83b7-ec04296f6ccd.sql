CREATE POLICY "Doctors with access can read patient incidents"
ON public.holarchelp_incidents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access dpa
    WHERE dpa.patient_user_id = holarchelp_incidents.user_id
      AND dpa.doctor_id = auth.uid()
      AND dpa.is_active = true
  )
);