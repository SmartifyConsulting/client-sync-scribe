## Goals

1. Start the voice-note recording the moment the patient picks a severity, so no opening words are lost.
2. Default the "Unconscious" count to 0 on the severity picker.
3. Make the ER Provider list reliably visible so the patient can change provider within the allowed window.

## Changes

### 1. Reorder fresh-trigger flow (`src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx`)

- On a fresh incident, open `SeverityPicker` first (not `SosVoiceNoteDialog`).
- When the patient taps a severity (Life-threatening / Urgent / …), immediately:
  - Persist the severity + headcounts (existing `finishSeverity` logic).
  - Kick off `navigator.mediaDevices.getUserMedia({ audio: true })` and start a `MediaRecorder` in the background.
  - Then open `SosVoiceNoteDialog`, handing it the already-running `MediaRecorder` + the audio chunks accumulated since severity click.
- "Skip" on the severity picker keeps the current behaviour (no recording).

### 2. `SosVoiceNoteDialog` accepts a pre-started recorder

- Add optional props `existingRecorder?: MediaRecorder` and `existingChunks?: Blob[]`.
- When provided, the dialog does not call `getUserMedia` again; it attaches its `ondataavailable`/`onstop` handlers to the in-flight recorder and uses the buffered chunks so the first words are preserved.
- Stop/cancel still works the same way.

### 3. SeverityPicker default (`src/modules/holarchelp/components/SeverityPicker.tsx`)

- Change `useState(1)` for `unconscious` to `useState(0)`.
- Leave People = 1 and Breathing = 1.
- The "skip triage" path already sends `unconsciousCount: 0`; no change needed there.

### 4. Restore ER Provider selector visibility (`HolarcHelpIncidentDetail.tsx` + `AvailableResponders.tsx`)

Today the change-provider list only renders when `autoAssigned === true`. If the patient picked manually, or `autoAssigned` is unset because the `auto_assigned` event hasn't landed yet, the switcher disappears even though the 30-second window is still open.

- Compute `assignedSecondsLeft` from `incident.accepted_at ?? incident.assigned_at ?? autoAssignedAt`.
- Render `<AvailableResponders … />` whenever `isLive && incident.assigned_provider_id && assignedSecondsLeft > 0`, regardless of `autoAssigned`.
- Pass `autoAssignedAt = autoAssignedAt ?? incident.accepted_at ?? incident.assigned_at` so the countdown inside the component is correct in both auto and manual cases.
- Inside `AvailableResponders`, also relax `isChangeMode` to `!!assignedProviderId && !!autoAssignedAt` (already true), but add a defensive fallback: if `offers` is empty in change mode, render an "ER Provider locked in / no other providers in range" line instead of returning `null`, so the section never silently disappears.
- Above the list, add a clear heading "Change ER Provider ({remaining}s)" with the +30 s extend button already present, so the option is unmistakable.

## Technical notes

- Recording auto-start needs a user gesture; the severity button tap satisfies browser autoplay/mic policies.
- Buffer chunks in a `useRef<Blob[]>` between severity tap and dialog mount so nothing is lost in the React render gap.
- If `getUserMedia` is rejected, fall back to the current "tap to record" UI in `SosVoiceNoteDialog` and toast a friendly message via `toastError`.
- No DB schema changes. No new RPCs. Only frontend.

## Out of scope

- Changing the auto-assign timer length or the severity wording.
- Server-side changes to `holarchelp_get_incident_offers` (already returns nearest providers as fallback).
