ALTER TABLE public.client_financial_profiles
  ADD COLUMN IF NOT EXISTS extracted_at timestamptz,
  ADD COLUMN IF NOT EXISTS extracted_from_session_id uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

-- Any change to the facts after verification means the client must verify again.
CREATE OR REPLACE FUNCTION public.cfp_reset_verification()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.verified_at IS NOT DISTINCT FROM OLD.verified_at AND (
     NEW.cash_flow IS DISTINCT FROM OLD.cash_flow OR NEW.assets_liabilities IS DISTINCT FROM OLD.assets_liabilities OR
     NEW.risk_portfolio IS DISTINCT FROM OLD.risk_portfolio OR NEW.investments IS DISTINCT FROM OLD.investments OR
     NEW.goals_risk IS DISTINCT FROM OLD.goals_risk OR NEW.estate IS DISTINCT FROM OLD.estate) THEN
    NEW.verified_at := NULL; NEW.verified_by := NULL;
  END IF;
  -- Only the verify function may set verification.
  IF NEW.verified_at IS DISTINCT FROM OLD.verified_at AND NEW.verified_at IS NOT NULL
     AND current_setting('wealth.verifying', true) IS DISTINCT FROM 'on' THEN
    NEW.verified_at := OLD.verified_at; NEW.verified_by := OLD.verified_by;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cfp_reset_verification ON public.client_financial_profiles;
CREATE TRIGGER cfp_reset_verification BEFORE UPDATE ON public.client_financial_profiles
  FOR EACH ROW EXECUTE FUNCTION public.cfp_reset_verification();

-- Client confirms the captured financial information is complete and correct.
CREATE OR REPLACE FUNCTION public.wealth_financials_verify(_patient_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wf record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patients WHERE id=_patient_id AND patient_user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Only the client can verify their own financial information';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM client_financial_profiles WHERE patient_id=_patient_id) THEN
    RAISE EXCEPTION 'No financial information has been captured yet';
  END IF;
  PERFORM set_config('wealth.verifying', 'on', true);
  UPDATE client_financial_profiles SET verified_at=now(), verified_by=auth.uid() WHERE patient_id=_patient_id;
  PERFORM set_config('wealth.verifying', 'off', true);
  SELECT * INTO wf FROM wealth_workflows WHERE patient_id=_patient_id AND current_stage='needs_analysis'
    AND status NOT IN ('completed','closed_declined') ORDER BY created_at DESC LIMIT 1;
  IF wf.id IS NOT NULL THEN
    PERFORM wealth_apply_stage(wf.id, 'information_required', '[]'::jsonb, 'client',
      'Client verified financial information as complete and correct', NULL, NULL, NULL);
  END IF;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.wealth_financials_verify(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wealth_financials_verify(uuid) TO authenticated;

-- Step 1 now also requires personal information.
CREATE OR REPLACE FUNCTION public.wealth_onboarding_refresh(_workflow_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; ok boolean;
BEGIN
  SELECT * INTO w FROM wealth_workflows WHERE id=_workflow_id;
  IF w IS NULL OR w.current_stage <> 'consultation' OR w.status IN ('completed','closed_declined') THEN RETURN false; END IF;
  ok := EXISTS (SELECT 1 FROM patients p WHERE p.id=w.patient_id
          AND coalesce(p.id_passport_number,'')<>'' AND p.dob IS NOT NULL
          AND coalesce(nullif(p.physical_address,''), nullif(p.address,'')) IS NOT NULL
          AND coalesce(p.marital_status,'')<>'')
    AND EXISTS (SELECT 1 FROM wealth_kyc_checks WHERE workflow_id=_workflow_id AND status='approved')
    AND EXISTS (SELECT 1 FROM wealth_signed_documents WHERE workflow_id=_workflow_id AND doc_type='disclosure')
    AND EXISTS (SELECT 1 FROM wealth_signed_documents WHERE workflow_id=_workflow_id AND doc_type='loa');
  IF ok THEN
    PERFORM wealth_apply_stage(_workflow_id, 'needs_analysis', '[]'::jsonb, 'system',
      'Personal information complete; identity screening passed; disclosure and LOA signed', NULL, NULL, NULL);
  END IF;
  RETURN ok;
END $$;
REVOKE EXECUTE ON FUNCTION public.wealth_onboarding_refresh(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wealth_onboarding_refresh(uuid) TO service_role;