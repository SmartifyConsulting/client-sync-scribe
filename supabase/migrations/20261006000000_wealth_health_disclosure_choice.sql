-- Clients can complete the health disclosure now, or defer it to be done
-- directly with the insurer (life/medical cover only).
ALTER TABLE public.wealth_compliance_checks
  ADD COLUMN IF NOT EXISTS health_disclosure_status text NOT NULL DEFAULT 'pending'
  CHECK (health_disclosure_status IN ('pending', 'completed', 'deferred_to_insurer'));
