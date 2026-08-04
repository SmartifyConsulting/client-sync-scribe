# Merge the post-session screen into the active Session screen

Today, stopping a recording moves the doctor to a "Processing Session" screen and then to a separate "completed" screen. That completed screen mostly repeats what was already on the active session screen, so the hand-off feels like a dead step.

## What changes

Stay on the active Session screen after the recording stops. The results appear in place, beneath the live session layout, so the doctor keeps the patient context and has time to read the AI Clinician output.

1. **Remove the standalone processing screen**
   - Stopping the recording keeps the active layout visible.
   - Processing is shown as an inline status strip at the top of the session screen ("Analysing session…" with a spinner), replaced by a completion banner when finished.

2. **Show results inline in the active session**
   - Once analysis completes, a results block renders under the existing session grid:
     - **Transcription** (with audio playback)
     - **AI Summary**
     - **Action Points** (with the "Added to To-Do List" confirmation)
     - **AI Clinician** panel with the confidential decision-support disclaimer, translate and narrate controls — laid out as in the reference image.
   - The recorder, Patient Overview, Personal Notes and Drawing Pad stay on screen above it.

3. **Auto-created documents appear on the same screen**
   - Documents detected from the transcript (prescription, medical certificate, invoice, referral, admission) render as preview cards in a **Documents from this session** section instead of only living behind a dialog.
   - Each card shows the document type, key details and a small preview, with actions: **Preview**, **Send**, **Save for review**, matching the existing document editor actions.
   - The existing "Create Document" picker stays, so the doctor can add a document that the AI did not detect.
   - The generated-documents dialog remains available (reopened from the section header) but is no longer the only path.

4. **End-of-session actions**
   - "Start New Session", "View To-Do List" and "View Patient Profile" move to the bottom of the same screen. Starting a new session clears the results block and resets to the idle/selector state.

## Technical notes

- `src/pages/Sessions.tsx`: collapse the `processing` and `completed` branches of `SessionState` into the `active` branch. Keep the state machine values so the existing completion pipeline (`handleSessionComplete`, follow-up, visit-category and Vula sequencing) is unchanged; only the rendering condition changes.
- Extract the results markup (Transcription / Summary / Action Points / AI Clinician) and the new documents section into components under `src/features/sessions/components/` so `Sessions.tsx` does not grow further.
- Document previews reuse the existing preview renderer (`resolveDocumentPreviewContent`) and `SendDocumentButton` for send/save so styling and behaviour match Documents elsewhere.
- Presentation and layout only: no schema changes, no edge-function changes, no change to when documents are created or Vulas are awarded.
