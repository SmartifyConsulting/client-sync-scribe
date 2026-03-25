

# Seven Fixes: Med Cert Dates, Button Labels, Rx Repeats, Template Rename, Calendar Services, Pricing Badge, End Session Voice

## 1. Medical Certificate: Auto-Detect Start/End Dates

The AI already extracts `start_date` and `end_date` from transcripts (line 152-153 of `summarize-session/index.ts`). The auto-created certificate uses `cert.from_date` and `cert.to_date` (line 546 of `useSessions.ts`). But the `MedicalCertificateEditor` only has a single `examinationDate` and a free-text `leavePeriod` — no structured start/end date fields.

**File:** `src/components/sessions/MedicalCertificateEditor.tsx`
- Replace `leavePeriod` (text input) with `startDate` and `endDate` (date inputs)
- Auto-calculate display: "3 days (Dec 11 - Dec 13, 2025)"
- When opening from a session context, pre-populate dates from the AI-extracted `from_date`/`to_date`

**File:** `src/hooks/useSessions.ts` (line 546)
- Already passes `cert.from_date` / `cert.to_date` into the auto-generated content — ensure the editor receives these when opened from a todo

## 2. Medical Certificate Button: "Approve & Send" → "Approve & Save"

**File:** `src/components/sessions/TranscriptionReviewDialogs.tsx` (line 101)
- Change `Approve & Send` to `Approve & Save`

**File:** `src/pages/TodoList.tsx` (line 576)
- Change tooltip `Approve & Send` to `Approve & Save`

## 3. Prescription Repeats: AI Auto-Population

The `MedicationItem` interface already has `repeats: string` (line 49 of `PrescriptionEditor.tsx`), and the UI for repeats exists. The AI schema in `summarize-session/index.ts` does NOT include a `repeats` field in the medication items.

**File:** `supabase/functions/summarize-session/index.ts` (line 166-173)
- Add `repeats` property to medication item schema: `{ type: "string", description: "Number of repeats or repeat instructions if mentioned" }`

**File:** `src/hooks/useSessions.ts` (line 446-451)
- Include `repeats` in auto-generated prescription table: add a Repeats column to the HTML table

## 4. Rename "All Documents" → "Patient Documents" Under Templates Tab

**File:** `src/pages/Documents.tsx` (line 613)
- Change `All Documents` to `Patient Documents`

**File:** `src/pages/patient/PrescriptionHistory.tsx` (line 144)
- Change `All Documents` to `Patient Documents`

## 5. Calendar "Schedule New Appointment" — Replace Type with Services

Currently the Type dropdown has 3 hardcoded options: Session, Follow-up, Internal Meeting. Replace with the doctor's service_prices list.

**File:** `src/pages/CalendarView.tsx` (lines 91-101, 327-341, 685-698)
- Fetch `service_prices` with `id, service_name, color` (already fetching for colors)
- Replace the hardcoded `<SelectItem>` options with dynamically loaded services from `service_prices`
- Store the service name as the `type` field, or add a `service_id` to the appointment
- Also update the edit dialog (lines 685-698) to use the same service list

## 6. Remove First Consult Badge from Pricing

**File:** `src/pages/MyPractice.tsx` (line 990)
- Remove the `{(service as any).is_first_consultation && <Badge>}` rendering
- Keep the toggle button (line 1004-1010) for setting first consult — just remove the visible badge from the list

## 7. Fix "End Session" Voice Detection

**Root cause:** The recording uses `mediaRecorder.start(1000)` which collects chunks every second, but transcription only happens in `onstop` — AFTER the recording ends. So the `endPhrases` check in `onTranscriptionComplete` only runs once the user has already stopped recording manually.

**Solution:** Add the Web Speech API (`SpeechRecognition`) as a lightweight parallel listener during recording. It runs in the browser, requires no API calls, and can detect "end session" in near real-time.

**File:** `src/hooks/useAudioRecording.ts`
- In `startRecording`, if `window.SpeechRecognition || window.webkitSpeechRecognition` is available, start a `SpeechRecognition` instance alongside the MediaRecorder
- Set `continuous = true`, `interimResults = true`
- In `onresult`, check if the recognized text contains end phrases
- If detected, call a new `onEndSessionDetected` callback
- Stop the SpeechRecognition when recording stops

**File:** `src/pages/Sessions.tsx`
- Add `onEndSessionDetected` callback to `useAudioRecording` options
- In the callback: toast, set pending, stop recording, show visit category dialog after delay

**File:** `src/vite-env.d.ts`
- Add `SpeechRecognition` and `webkitSpeechRecognition` type declarations

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/sessions/MedicalCertificateEditor.tsx` | Replace text leavePeriod with startDate/endDate date pickers |
| `src/components/sessions/TranscriptionReviewDialogs.tsx` | "Approve & Send" → "Approve & Save" |
| `src/pages/TodoList.tsx` | Tooltip "Approve & Send" → "Approve & Save" |
| `supabase/functions/summarize-session/index.ts` | Add `repeats` to prescription medication schema |
| `src/hooks/useSessions.ts` | Include repeats in auto-generated prescription HTML |
| `src/pages/Documents.tsx` | "All Documents" → "Patient Documents" |
| `src/pages/patient/PrescriptionHistory.tsx` | "All Documents" → "Patient Documents" |
| `src/pages/CalendarView.tsx` | Replace hardcoded Type options with service_prices list |
| `src/pages/MyPractice.tsx` | Remove first consult badge from pricing list |
| `src/hooks/useAudioRecording.ts` | Add Web Speech API for live "End Session" detection |
| `src/pages/Sessions.tsx` | Add `onEndSessionDetected` callback |
| `src/vite-env.d.ts` | Add SpeechRecognition type declarations |

