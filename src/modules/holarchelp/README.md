# HolarcHelp Module

Optional, admin-toggled SOS / emergency module.

> **Naming history:** This module was originally imported under the codename "Guardian". The user-facing name and folder/route names are now **HolarcHelp**. The Supabase storage bucket is still `guardian-voice-clips` (see `lib/storage.ts`) — renaming the bucket requires copying every object and is left for a future maintenance window.

## What's in this slice

- **DB:** `holarchelp_*` tables (incidents, locations, contacts, hospitals, ambulance providers, offers, events, cancellations, feedback, messaging log, voice clip settings) + `app_modules` registry + `profiles.holarchelp_enabled`.
- **Patient frontend:** `HolarcHelpHome` (hold-to-trigger SOS), `HolarcHelpContacts`, `HolarcHelpIncidents`, `HolarcHelpIncidentDetail` (live map + WhatsApp + resolve), `PublicTrack` (anonymous live-tracking page at `/track/:token`).
- **Provider portal:** `pages/provider/*` mounted at `/provider/*` — dispatch dashboard, active incident detail, provider profile editor (hospital or ambulance).
- **Admin:** Providers admin page at `/admin/holarchelp-providers` for approving / suspending hospitals and ambulance providers. Per-user toggle in `/admin/users`.
- **Gating:** `useHolarcHelpAccess()` + `<HolarcHelpGate />` enforce both the global module switch and per-user `profiles.holarchelp_enabled`. `<ProviderGate />` enforces `hospital_staff` / `ambulance_staff` roles.
- **Nav:** "SOS" entry appears in the patient `BottomNav` only when enabled.

## Routes

- `/patient/holarchelp` — patient SOS home
- `/patient/holarchelp/contacts` — emergency contacts
- `/patient/holarchelp/incidents` — incident history
- `/patient/holarchelp/incident/:id` — incident detail with live map
- `/track/:token` — public live tracking link (no auth)
- `/provider` — provider dispatch dashboard
- `/provider/incident/:id` — provider's view of an active incident
- `/provider/profile` — hospital / ambulance profile editor
- `/admin/holarchelp-providers` — admin approval & management

## Deferred

- Geo-based incident filtering for providers (today: lists all `pending` incidents).
- Public provider self-signup wizard (today: admin creates the provider record manually).
- The 15 HolarcHelp edge functions (`sos-dispatch`, `dispatch-broadcast`, `incident-accept/cancel/feedback/monitor/status`, `at-voice-callback`, `voice-clip-upload-url`, email queue functions). The `AT_API_KEY`/`AT_USERNAME` secrets are already stored.
