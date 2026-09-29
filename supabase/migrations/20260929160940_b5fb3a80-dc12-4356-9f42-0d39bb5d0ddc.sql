
REVOKE EXECUTE ON FUNCTION public.wealth_has_doc(uuid,text), public.wealth_refresh(uuid,text,uuid), public.wealth_derive_stage(uuid),
  public.wealth_protect_recommendation(), public.wealth_on_record_change(), public.wealth_after_record_change(), public.wealth_after_document_change()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wealth_blockers(uuid,text), public.wealth_transition(uuid,text,text), public.wealth_record_decision(uuid,text,text),
  public.wealth_present_recommendation(uuid), public.wealth_start_annual_review(uuid,uuid,uuid), public.wealth_start_workflow(uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wealth_blockers(uuid,text), public.wealth_transition(uuid,text,text), public.wealth_record_decision(uuid,text,text),
  public.wealth_present_recommendation(uuid), public.wealth_start_annual_review(uuid,uuid,uuid), public.wealth_start_workflow(uuid,uuid) TO authenticated;
