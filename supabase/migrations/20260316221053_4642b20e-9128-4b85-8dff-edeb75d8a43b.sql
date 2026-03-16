CREATE POLICY "Patients can insert adherence rewards"
ON public.patient_rewards FOR INSERT TO authenticated
WITH CHECK (
  reward_type = 'medication_adherence'
  AND lollipops_count > 0
  AND EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_rewards.patient_id
    AND p.patient_user_id = auth.uid()
  )
  AND auth.uid() = awarded_by
);