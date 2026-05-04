ALTER TABLE public.holarchelp_hospitals ADD COLUMN IF NOT EXISTS dispatch_priority integer NOT NULL DEFAULT 50;

CREATE OR REPLACE FUNCTION public.holarchelp_provider_accountability()
RETURNS TABLE (
  provider_id uuid,
  provider_type text,
  name text,
  status text,
  country text,
  tier text,
  dispatch_priority integer,
  accepts bigint,
  avg_arr_min numeric,
  cancels bigint,
  critical_cancels bigint,
  stalled bigint,
  avg_rating numeric,
  flags bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.id, 'hospital'::text, h.name, h.status::text, h.country, h.tier::text, h.dispatch_priority,
    (SELECT count(*) FROM holarchelp_incident_offers o WHERE o.provider_id=h.id AND o.response='accepted'),
    (SELECT avg(EXTRACT(EPOCH FROM (i.resolved_at - o.responded_at))/60)
       FROM holarchelp_incident_offers o JOIN holarchelp_incidents i ON i.id=o.incident_id
       WHERE o.provider_id=h.id AND o.response='accepted' AND i.resolved_at IS NOT NULL AND o.responded_at IS NOT NULL),
    (SELECT count(*) FROM holarchelp_incident_cancellations c WHERE c.provider_id=h.id),
    (SELECT count(*) FROM holarchelp_incident_cancellations c JOIN holarchelp_incidents i ON i.id=c.incident_id
       WHERE c.provider_id=h.id AND i.severity IN ('high','critical')),
    (SELECT count(*) FROM holarchelp_incident_offers o JOIN holarchelp_incidents i ON i.id=o.incident_id
       WHERE o.provider_id=h.id AND o.response='accepted' AND i.resolved_at IS NULL AND o.responded_at < now() - interval '15 minutes'),
    (SELECT avg(f.rating) FROM holarchelp_incident_feedback f JOIN holarchelp_incidents i ON i.id=f.incident_id WHERE i.assigned_provider_id=h.id),
    (SELECT count(*) FROM holarchelp_incident_feedback f JOIN holarchelp_incidents i ON i.id=f.incident_id WHERE i.assigned_provider_id=h.id AND f.critical_flag=true)
  FROM holarchelp_hospitals h
  WHERE has_role(auth.uid(), 'admin'::user_role)
  UNION ALL
  SELECT a.id, 'ambulance'::text, a.company_name, a.status::text, a.country, a.tier::text, a.dispatch_priority,
    (SELECT count(*) FROM holarchelp_incident_offers o WHERE o.provider_id=a.id AND o.response='accepted'),
    (SELECT avg(EXTRACT(EPOCH FROM (i.resolved_at - o.responded_at))/60)
       FROM holarchelp_incident_offers o JOIN holarchelp_incidents i ON i.id=o.incident_id
       WHERE o.provider_id=a.id AND o.response='accepted' AND i.resolved_at IS NOT NULL AND o.responded_at IS NOT NULL),
    (SELECT count(*) FROM holarchelp_incident_cancellations c WHERE c.provider_id=a.id),
    (SELECT count(*) FROM holarchelp_incident_cancellations c JOIN holarchelp_incidents i ON i.id=c.incident_id
       WHERE c.provider_id=a.id AND i.severity IN ('high','critical')),
    (SELECT count(*) FROM holarchelp_incident_offers o JOIN holarchelp_incidents i ON i.id=o.incident_id
       WHERE o.provider_id=a.id AND o.response='accepted' AND i.resolved_at IS NULL AND o.responded_at < now() - interval '15 minutes'),
    (SELECT avg(f.rating) FROM holarchelp_incident_feedback f JOIN holarchelp_incidents i ON i.id=f.incident_id WHERE i.assigned_provider_id=a.id),
    (SELECT count(*) FROM holarchelp_incident_feedback f JOIN holarchelp_incidents i ON i.id=f.incident_id WHERE i.assigned_provider_id=a.id AND f.critical_flag=true)
  FROM holarchelp_ambulance_providers a
  WHERE has_role(auth.uid(), 'admin'::user_role);
$$;