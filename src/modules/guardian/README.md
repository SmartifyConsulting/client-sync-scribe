# Holarc Guardian Module

Optional, admin-toggled SOS / emergency module imported from the Holarc Guardian project.

## What's in this MVP slice

- **DB:** `guardian_*` tables (incidents, locations, contacts, hospitals, ambulance providers, offers, events, cancellations, feedback, messaging log, voice clip settings) + `app_modules` registry + `profiles.guardian_enabled`.
- **Frontend:** `GuardianHome` (hold-to-trigger SOS), `GuardianContacts`, `GuardianIncidents`, `GuardianIncidentDetail` (live map + WhatsApp + resolve), `PublicTrack` (anonymous live-tracking page at `/track/:token`).
- **Gating:** `useGuardianAccess()` + `<GuardianGate />` enforce both the global module switch and per-user `profiles.guardian_enabled`.
- **Admin toggle:** Per-user switch in `/admin/users`.
- **Nav:** "Guardian SOS" entry appears in the patient `BottomNav` only when enabled.

## Deferred — not yet imported

These pages exist in the Guardian project but were **not** ported in this pass to keep
the change focused. Add when needed:

- Provider portal pages: `Discover`, `RegisterProvider`, `ProviderDashboard`, `ProviderQueue`, `ProviderIncident`.
- Admin pages: `AdminProviders`, `AdminIncident`, `AdminVoiceClips`, `AdminAccountability`, `MessagingLog`.
- `IncidentFeedback` rating page (table exists, page TBD).
- The 15 Guardian edge functions (`sos-dispatch`, `dispatch-broadcast`, `incident-accept/cancel/feedback/monitor/status`, `at-voice-callback`, `voice-clip-upload-url`, email queue functions). The `AT_API_KEY`/`AT_USERNAME` secrets are already stored and ready when these are added.

The DB schema is complete, so each deferred page can be added later by copying the file from the Guardian project and rewriting `incidents` → `guardian_incidents`, etc.
