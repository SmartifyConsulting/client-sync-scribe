
-- Fix 1: Drop overly permissive patient_streaks policy and replace with authenticated-only
DROP POLICY IF EXISTS "System can manage streaks" ON patient_streaks;

CREATE POLICY "Authenticated system can manage streaks"
ON patient_streaks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Fix 2: Drop overly permissive CPD certificates policy
DROP POLICY IF EXISTS "Anyone authenticated can view CPD certificates" ON cpd_certificates;
