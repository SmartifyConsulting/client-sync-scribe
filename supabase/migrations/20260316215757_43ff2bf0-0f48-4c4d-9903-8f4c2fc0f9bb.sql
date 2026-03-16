
CREATE POLICY "Patients can insert transfer deductions"
ON public.patient_rewards FOR INSERT TO authenticated
WITH CHECK (
  reward_type = 'transfer'
  AND lollipops_count < 0
  AND EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_rewards.patient_id
    AND p.patient_user_id = auth.uid()
  )
  AND auth.uid() = awarded_by
);
