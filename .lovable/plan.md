# Plan

## 1. Add HolarcHelp / SOS to desktop & tablet sidebar

`src/components/layout/Sidebar.tsx`:
- Append a 6th item to **`doctorNavItems`**: `{ icon: Siren, label: "SOS", to: "/doctor/holarchelp" }` rendered with red text/red bg on hover (mirroring BottomNav `danger` style).
- Append a 5th item to **`patientNavItems`**: `{ icon: Siren, label: "SOS", to: "/patient/holarchelp" }` with the same danger styling.
- Pass a `danger` flag through the existing render loop so the sidebar treats the SOS item the way `BottomNav` already does.

## 2. Make the mobile SOS button more prominent

In `src/components/layout/BottomNav.tsx`:
- Render the SOS item as an oversized **solid red circle** (~52px) with a white `Siren` icon and the white text "SOS" beneath, breaking out of the normal cell so it visually pops above the bar (negative top margin, soft red glow).
- Keep all other items unchanged.

## 3. Voice note + transcription when SOS is triggered

After the incident is created in `HolarcHelpHome.tsx → triggerSOS`, open a new dialog **`SosVoiceNoteDialog`** (in `src/modules/holarchelp/components/`) with:
- A loud prompt: "Describe the incident — what happened, how many people are injured, and how serious."
- Two buttons: **Start Recording** / **Cancel** (Cancel just dismisses; the SOS continues without a note).
- Once recording, a single **Stop & Send** button. Recording uses `MediaRecorder` (audio/webm). Auto-stop after 60s.
- On stop → upload the blob to the existing `transcribe-audio` edge function → write the resulting text into `holarchelp_incidents.notes` (column already exists) plus a new column `voice_note_audio_url` for the playback (storage bucket `session-audio`, signed URL).

Schema migration: add `voice_note_audio_url text`, `voice_note_transcript text` to `holarchelp_incidents` (the existing `notes` is already used for other purposes by some flows, so we keep the transcript in its own column for clarity).

Visibility for responders: `HolarcHelpIncidentDetail.tsx` and `provider/ProviderIncidentDetail.tsx` already render incident fields — add a "Patient voice note" panel showing the transcript + a play button for the audio. RLS on `holarchelp_incidents` already grants the assigned provider read access.

Hospital admission summary: when an incident is converted into a hospital admission (existing `hospital_admissions` flow), pre-fill the admission `presenting_complaint` / `clinical_notes` field with a short Gemini summary of the transcript via `summarize-session` (or a small inline call to `summarize-patient-history`). Implementation: from `HolarcHelpIncidentDetail`'s "Convert to admission" path, call `summarize-session` with the transcript and inject the result.

## 4. Connect Vula APIs to 6dot50 portal

`https://portal.6dot50.com/` is a login portal only — no public API documentation surfaces. To proceed I need:

- The 6dot50 **API base URL** and any auth method (API key vs. OAuth client id/secret).
- Sample endpoint(s) you want to call from the Vula referral/quote flow (e.g. partner verification, claim submission, member lookup).
- Whether traffic should originate from a Lovable Cloud edge function (server-to-server with a stored API key) or per-doctor OAuth.

Once you share the docs / credentials I will:
- Add a `vula-6dot50-proxy` edge function that accepts a Vula request payload and forwards to the relevant 6dot50 endpoint with the stored API key.
- Store the 6dot50 API key as a Lovable Cloud secret (will trigger the `add_secret` prompt at that point).
- Wire the existing Vula integration call sites to invoke the proxy.

I'll surface the secret prompt and create the proxy function in the same loop, but only after you confirm the endpoint URLs / credentials format.

## Files

- **Edit:** `src/components/layout/Sidebar.tsx`, `src/components/layout/BottomNav.tsx`, `src/modules/holarchelp/pages/HolarcHelpHome.tsx`, `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx`, `src/modules/holarchelp/pages/provider/ProviderIncidentDetail.tsx`
- **New:** `src/modules/holarchelp/components/SosVoiceNoteDialog.tsx`
- **Migration:** add `voice_note_audio_url`, `voice_note_transcript` to `holarchelp_incidents`
- **6dot50 integration:** deferred until you provide API docs / credentials
