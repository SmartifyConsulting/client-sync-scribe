
-- Fix 1: Prevent privilege escalation - restrict user_roles INSERT to non-admin roles only
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;

CREATE POLICY "Users can insert their own non-admin role"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role IN ('doctor', 'patient'));

-- Fix 2: Replace overly permissive patient_streaks ALL policy with scoped policies
DROP POLICY IF EXISTS "Authenticated system can manage streaks" ON patient_streaks;

-- Doctors can manage streaks for their patients
CREATE POLICY "Doctors can manage streaks for their patients"
ON patient_streaks
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM patients WHERE id = patient_streaks.patient_id AND user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM patients WHERE id = patient_streaks.patient_id AND user_id = auth.uid()));

-- Patients can update their own streaks (for recording completions)
CREATE POLICY "Patients can manage their own streaks"
ON patient_streaks
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM patients WHERE id = patient_streaks.patient_id AND patient_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM patients WHERE id = patient_streaks.patient_id AND patient_user_id = auth.uid()));
