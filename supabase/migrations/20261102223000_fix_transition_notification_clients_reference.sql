-- Repair the transition notification trigger after patients was renamed.
-- Preserve notification logic, function ownership, and existing grants.
DO $repair$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.wealth_notify_transition()'::regprocedure)
  INTO definition;
  definition := regexp_replace(definition,
    '\m(FROM|JOIN)\s+(public\.)?patients\M', '\1 public.clients', 'gi');
  EXECUTE definition;
END;
$repair$;
