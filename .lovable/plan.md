## Two actions

### 1. Close the open SOS incident
Run a one-off DB update (no app code change):

```sql
UPDATE public.holarchelp_incidents
SET status='completed', completed_at=now(), resolved_at=now()
WHERE id='df59b35f-7f4c-475c-b83b-0b88073caa37';

INSERT INTO public.holarchelp_incident_events (incident_id, event_type, payload)
VALUES ('df59b35f-7f4c-475c-b83b-0b88073caa37', 'completed', '{"closed_by":"manual"}'::jsonb);
```

### 2. Nigeria-wide providers map screenshot
Build a temporary admin/demo route `/demo/nigeria-map` that:
- Queries `holarchelp_hospitals` and `holarchelp_ambulance_providers` filtered to `country ILIKE '%nigeria%'` (status approved).
- Renders a full-screen Google Map centered on Nigeria (lat 9.08, lng 8.67, zoom 6) using existing `LiveMap` infrastructure / google-maps config.
- Plots hospitals as red cross markers and ambulances as blue ambulance markers, with a legend top-left and provider count chips.
- Includes a clean header "HolarcHelp Nigeria — Live Provider Network" suitable for the boardroom deck.

Then ensure Nigeria seed data exists (Lagos providers from prior seed + add 6–8 more across Abuja, Port Harcourt, Kano, Ibadan, Enugu, Kaduna so the map looks populated nationally). Capture a 1080×2160 phone-frame screenshot via the browser tool and save to `/mnt/documents/nigeria/10-nigeria-providers-map.png`, then append it to the boardroom PDF deck as a new page.

No RLS or schema changes — read-only public-ish view gated to admin/demo.