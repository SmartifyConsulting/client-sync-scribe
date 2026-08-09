CREATE POLICY "Patients can insert programme adherence rewards"
ON public.patient_rewards
FOR INSERT TO authenticated
WITH CHECK (
  reward_type = 'programme_adherence'
  AND lollipops_count > 0
  AND auth.uid() = awarded_by
  AND EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_rewards.patient_id AND p.patient_user_id = auth.uid()
  )
);

CREATE POLICY "Connected doctors can award programme rewards"
ON public.patient_rewards
FOR INSERT TO authenticated
WITH CHECK (
  reward_type IN ('programme_adherence','weight_loss')
  AND lollipops_count > 0
  AND auth.uid() = awarded_by
  AND public.can_manage_patient_programme(patient_id)
);

CREATE POLICY "Connected care team can view programme rewards"
ON public.patient_rewards
FOR SELECT TO authenticated
USING (public.can_manage_patient_programme(patient_id));

REVOKE EXECUTE ON FUNCTION public.can_manage_patient_programme(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_patient_programme(uuid) FROM anon;