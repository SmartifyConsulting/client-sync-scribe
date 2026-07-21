UPDATE public.holarchelp_incidents
SET status = 'open',
    assigned_provider_id = NULL,
    assigned_paramedic_user_id = NULL,
    accepted_at = NULL,
    destination_hospital_id = NULL
WHERE incident_number = 'INC-2026-001070';

DELETE FROM public.holarchelp_incident_events
WHERE incident_id = (SELECT id FROM public.holarchelp_incidents WHERE incident_number = 'INC-2026-001070')
  AND event_type IN ('auto_assigned','assigned','accepted','patient_picked','patient_changed_provider','reassigned','hospital_inbound');

DELETE FROM public.holarchelp_incident_offers
WHERE incident_id = (SELECT id FROM public.holarchelp_incidents WHERE incident_number = 'INC-2026-001070');