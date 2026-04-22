

# Plan: Fix transcription, add Pause, fix To-Do preview, launch Vulas explainer

## 1. Fix transcription (broken — root cause confirmed in logs)

The edge function logs show: `TypeError: Invalid URL: '54fa34d8.../...webm'`. The client sends the **storage path** (e.g. `userId/sessionId_ts.webm`), and `transcribe-audio` calls `fetch(audioUrl)` on it directly — but `session-audio` is a private bucket, so the path is not a URL.

**File: `supabase/functions/transcribe-audio/index.ts`**
- Replace the raw `fetch(audioUrl)` branch with a service-role download from the `session-audio` bucket using the storage SDK:
  ```ts
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: blob, error } = await admin.storage.from('session-audio').download(audioUrl);
  ```
- Wrap external calls (Whisper + storage download) in try/catch that returns a structured `{ error, fallback: true }` JSON instead of HTTP 500, so the client can surface a friendly message.

## 2. Add Pause / Resume to session recording

**File: `src/hooks/useAudioRecording.ts`**
- Add `isPaused` state and `pauseRecording()` / `resumeRecording()` calling `mediaRecorder.pause()` / `.resume()`.
- Pause Web Speech recognition while paused; resume on resume.
- Export the new state + functions.

**File: `src/pages/Sessions.tsx`**
- In the recording control bar (around line 850), render a Pause/Resume button next to the Stop button while `isRecording`. Pause icon when running, Play icon when paused. Timer also pauses (gate the existing `setSessionDuration` interval on `!isPaused`).

## 3. Fix To-Do List doc preview (still navigates to Templates)

**File: `src/components/dashboard/CompactTodoList.tsx`** — currently the Eye and FileText buttons both call `navigate('/documents?view=...')`, which lands on the templates/documents page.

- Mirror the in-place modal pattern from `src/pages/TodoList.tsx`:
  - Add `previewDoc` state + `useDocumentHeaderFooter` + `useProfile`.
  - Add a `handlePreviewDoc(todo)` that loads the document, applies profile placeholders, and sets `previewDoc`.
  - Render `<DocumentPreview ... onClose={() => setPreviewDoc(null)} />` at the bottom of the component.
  - Wire the **Eye** button to `handlePreviewDoc(todo)` (modal opens, no navigation).
  - Remove the redundant FileText button (it was a duplicate of Eye).
- Result: clicking the eye icon on a to-do opens the document preview overlay on the home page; closing it returns the user to the home page — no route change.

## 4. Launch the Vulas explainer (first-time + always available)

The user uploaded the official "VULA VOUCHERS" launch graphic with the explanatory copy. We surface this as a reusable explainer modal on both rewards screens.

**New file: `src/components/rewards/VulaExplainerDialog.tsx`**
- A `<Dialog>` styled to match the uploaded reference: gradient blue→teal hero, "Vula means rain in isiZulu and isiXhosa" heading, two bullet sections ("Vulas reward real-world actions", "Vulas are a simple way to start building value that grows with you"), and an "Earn Vulas" CTA at the bottom.
- Props: `open`, `onOpenChange`, optional `onCta` (defaults to closing).

**New asset:** copy uploaded image into `src/assets/vula-explainer.png` for the hero illustration.

**Files: `src/pages/doctor/DoctorRewards.tsx` and `src/pages/patient/MyRewards.tsx`**
- Add a small "What are Vulas?" link/info button in the page header (next to the title), opening the dialog.
- First-launch behaviour: read/write `localStorage` key `vulas_explainer_seen_v1`. If absent on mount, auto-open the dialog and set the flag on close. Users can reopen any time via the header button.

## Out of scope
- Refactoring `CompactTodoList`'s ad-hoc recorder (separate cleanup).
- Vulas redemption/transfer changes.
- Service-worker / offline support for the PWA (already deferred).

