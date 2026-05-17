## Hospital nav: collapse providers into one menu with sub-tabs

**`src/components/layout/ProviderSidebar.tsx`** — Replace the three separate hospital nav items ("Our Doctors", "Our Nurses", "Our ER Providers") with a single **"Providers"** item (icon: `Users`, route: `/provider/hospital/providers`). Highlight as active when `pathname.startsWith("/provider/hospital/providers")` OR matches the three legacy paths (back-compat).

**New page `src/modules/holarchelp/pages/provider/HospitalProviders.tsx`** — Tabbed shell (shadcn `Tabs`, teal `bg-primary` TabsList per style manifest) with three triggers: **Doctors**, **Nurses**, **ER Providers**. Each tab renders the existing page body, factored out of the current `HospitalDoctors.tsx` / `HospitalNurses.tsx` / `HospitalAmbulances.tsx` (extract their inner JSX into `DoctorsTab`, `NursesTab`, `ErProvidersTab` components co-located in `pages/provider/providers/`). Initial tab driven by `?tab=doctors|nurses|er` (default `doctors`).

**Routing (`src/modules/holarchelp/routes-provider.tsx`)** — Add `/provider/hospital/providers` → `HospitalProviders`. Keep the three legacy routes as redirects to `/provider/hospital/providers?tab=...` so existing links still work.

## Auto-assignment timer: 60 s → 30 s

**`src/modules/holarchelp/components/AvailableResponders.tsx`** — Change `AUTO_ASSIGN_MS = 60 * 1000` to `30 * 1000`. Copy ("Auto-assign in …", "we'll auto-assign the closest one in …") still uses the same constant so it reflows automatically.

No DB / edge-function change needed — `holarchelp_auto_assign_incident` is already invoked by the client when the countdown hits zero.

## Voice note transcription — initial + every subsequent note

**Initial SOS voice note (`SosVoiceNoteDialog.tsx`)** — Transcription is already attempted via `transcribe-audio`, but failures are silent and the user sees no transcript. Harden it:

1. After the audio path is saved, call `transcribe-audio` and **retry up to 2× with exponential backoff** (1 s, 3 s) if it fails or returns empty.
2. On final failure, write `voice_note_transcript = "(Transcription unavailable — tap to retry)"` so responders see something actionable; expose a small "Retry transcription" button on `HolarcHelpIncidentDetail.tsx` that re-runs the edge function against `voice_note_audio_url`.
3. Add a `voice_note` event to `holarchelp_incident_events` with `payload: { kind: "initial", duration }` so it appears on the timeline.

**Subsequent voice notes (`IncidentVoiceNoteRecorder.tsx`)** — Same hardening: wrap the existing best-effort `transcribe-audio` call in 2× retry, persist `transcript` reliably, and show a per-note "Retry transcription" button when `transcript` is null. (The component already lists notes with their transcripts; the gap is reliability + a retry path.)

Both flows continue to use the existing `transcribe-audio` edge function — no new secrets, no schema change.

## Timeline: show which ambulance / ER provider was assigned

The timeline already enriches `auto_assigned`, `patient_picked`, and `accepted` events with the provider name inline on the **same line as the label**. The user wants the provider call-out to appear **after the date/time stamp** so it reads as a clear follow-up to the clinical timestamp row.

**`IncidentTimeline.tsx`** — For events in `PROVIDER_EVENTS` with a known provider, render the provider line **below** the timestamp instead of inline:

```
Auto-assigned
14:32 · 17 May
🚑 City Ambulance Services  (auto-assigned)
```

Use a dedicated badge row (rounded chip, teal border, `Ambulance` / `Hospital` icon) so it visually stands out from generic event metadata. Label suffix differentiates `auto_assigned` ("auto-assigned"), `accepted` / `patient_picked` ("responded & picked the call"). No event-emission change needed — the existing `holarchelp_accept_incident`, `holarchelp_auto_assign_incident`, and `holarchelp_patient_pick_provider` RPCs already insert these events with `provider_id`.

## Files touched

- `src/components/layout/ProviderSidebar.tsx`
- `src/modules/holarchelp/routes-provider.tsx`
- `src/modules/holarchelp/pages/provider/HospitalProviders.tsx` (new)
- `src/modules/holarchelp/pages/provider/providers/{DoctorsTab,NursesTab,ErProvidersTab}.tsx` (new, extracted from existing pages)
- `src/modules/holarchelp/components/AvailableResponders.tsx`
- `src/modules/holarchelp/components/SosVoiceNoteDialog.tsx`
- `src/modules/holarchelp/components/IncidentVoiceNoteRecorder.tsx`
- `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` (retry button for initial transcript)
- `src/modules/holarchelp/components/IncidentTimeline.tsx`

No migrations, no new edge functions, no secrets.
