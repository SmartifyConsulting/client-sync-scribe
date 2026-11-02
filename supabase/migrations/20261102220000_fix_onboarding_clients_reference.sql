-- Preserve the live onboarding rules and grants; repair only the renamed table.
DO $repair$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef('public.wealth_onboarding_refresh(uuid)'::regprocedure)
  INTO definition;

  definition := regexp_replace(
    definition,
    '\m(FROM|JOIN)\s+(public\.)?patients\M',
    '\1 public.clients',
    'gi'
  );
  EXECUTE definition;
END;
$repair$;
