WITH closed AS (
  UPDATE public.holarchelp_incidents
  SET status = 'completed'
  WHERE status IN ('open','assigned','en_route','arrived','patient_collected','at_hospital')
  RETURNING id
)
INSERT INTO public.holarchelp_incident_events (incident_id, event_type, payload)
SELECT id, 'completed', jsonb_build_object('reason', 'Closed by admin (demo cleanup)') FROM closed;