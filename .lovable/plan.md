
## Scope

1. **Languages** — waiting on the list you mentioned attaching. Once you upload it I'll diff it against `src/i18n/SUPPORTED_LANGUAGES`, add/remove locales, update flags, and regenerate the per-language JSON stubs in one follow-up pass. No language changes happen in this plan.
2. **LIVE SOS Incident Feed** — implemented now, end-to-end, for ambulance providers (Renken).

## LIVE SOS Incident Feed

### Where it appears
- **Dashboard summary widget** on `/provider/ambulance` (top of the page, above existing KPIs): compact "Live SOS" card showing the 5 most recent active incidents with severity dot, patient name, suburb, "time since", and a "View all" link.
- **Dedicated page** at `/provider/ambulance/live-sos` reached from a new sidebar item **Live SOS** (siren icon, red dot when active count > 0). Full-screen split view: incident list on the left, map + detail panel on the right.

### Feed behaviour
- Reads from existing `holarchelp_incidents` table filtered by `provider_id = Renken` and `status IN ('pending','accepted','en_route','on_scene')`.
- Subscribes via Realtime (`postgres_changes` on `holarchelp_incidents`) inside a `useEffect` with channel teardown, per the realtime guidance.
- New incidents flash with a pulse + soft chime (mute toggle persisted to localStorage).
- Each row shows: severity badge (Critical / High / Medium / Low — color-coded), chief complaint, patient name + age, pickup address, distance from base, elapsed time, assigned ambulance (or "Unassigned"), and quick actions: **Accept**, **Assign Ambulance**, **Decline**, **Open**.
- Detail panel: full triage summary (AI-generated text already stored), vitals if present, NOK contact, map with pickup pin + nearest hospital, ETA estimate.

### Dummy data (20 incidents)
Seed via insert tool into `holarchelp_incidents` for Renken:
- 6 **Active now** (status pending/accepted/en_route/on_scene, created in last 0–25 min) — mix of cardiac arrest, MVA, stroke, pediatric seizure, anaphylaxis, GSW.
- 8 **Recent (last 6 h)** completed/transported — populate history rail.
- 6 **Last 24 h** mix of cancelled, completed, declined — for filter testing.
- Each linked to a seeded ambulance from RA-01…RA-06, with realistic Joburg coordinates (Sandton, Fourways, Rosebank, Soweto, Midrand, Bryanston), patient names, ages, chief complaints, and pre-filled AI emergency summaries.
- Add matching `holarchelp_incident_events` rows (dispatched / accepted / en_route / on_scene / transported) so the timeline renders.

### Files

```text
src/modules/holarchelp/pages/provider/ambulance/
  LiveSOSScreen.tsx           NEW  full-page feed + map + detail
  components/
    SOSIncidentCard.tsx       NEW  list row
    SOSDashboardWidget.tsx    NEW  dashboard summary (5 rows + View all)
    SOSSeverityBadge.tsx      NEW  color-coded pill
    SOSMuteToggle.tsx         NEW  bell / bell-off
src/modules/holarchelp/hooks/
  useLiveSOSFeed.ts           NEW  query + realtime subscription, returns active/recent
src/modules/holarchelp/routes-provider.tsx   add /provider/ambulance/live-sos
src/components/layout/ProviderSidebar.tsx    add Live SOS entry (siren icon, red badge)
src/modules/holarchelp/pages/provider/AmbulanceDashboard.tsx   mount SOSDashboardWidget
src/i18n/locales/*.json       add liveSOS.* keys (en/fr/es/pt/de minimum, others get English fallback)
```

### Technical notes (for the team)
- Reuse existing `holarchelp_incidents` columns; no schema changes needed. Confirmed columns include `provider_id`, `status`, `chief_complaint`, `severity`, `pickup_lat/lng`, `patient_name`, `ai_emergency_summary`, `assigned_ambulance_id`.
- If Realtime is not yet enabled on `holarchelp_incidents`, the hook falls back to a 10-second poll; we'll add a one-line `ALTER PUBLICATION supabase_realtime ADD TABLE holarchelp_incidents` migration only if needed.
- Chime: small base64 wav, no asset download. Muted by default; user toggle persisted per profile.
- Map: reuse the same map component already used in `TelematicsScreen.tsx` (no new map provider).

## Out of scope (this plan)
- Language list changes — handled in the next turn after you attach the list.
- Real SOS dispatching logic for production patients (this is demo-only).

## What I need from you
Please drop the language list into the chat (text, CSV, or image is fine). The SOS feed work above proceeds regardless.
