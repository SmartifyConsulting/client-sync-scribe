CREATE OR REPLACE FUNCTION public.wealth_claims_status_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = NEW.patient_id AND p.patient_user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only your Wealth Manager can change the status of a claim.';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS wealth_claims_status_guard ON public.wealth_claims;
CREATE TRIGGER wealth_claims_status_guard BEFORE UPDATE ON public.wealth_claims FOR EACH ROW EXECUTE FUNCTION public.wealth_claims_status_guard();