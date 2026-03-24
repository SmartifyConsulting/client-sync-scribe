

# Fix 7 Issues: Compare Images, Rating, Todo Titles, End Session, Transcription Colors, Document Options, Preview Icon

## 1. Add Compare Images Button to Doctor's Patient Profile

**Problem:** `ImageComparisonDialog` is only in `PatientDocuments.tsx` (patient's own view). Doctors viewing a patient via `PatientProfile.tsx` have no Compare Images button.

**File:** `src/pages/PatientProfile.tsx`
- Import `ImageComparisonDialog` and `GitCompare` icon
- Add state `showCompareDialog`
- Add a Compare Images button next to the existing Upload/Create Document buttons (around line 563)
- Render `<ImageComparisonDialog>` at bottom of component, passing `patient.id`

## 2. Remove "Rate Session with Patient" Completely

**Problem:** After a doctor completes a session, `StarRatingDialog` appears prompting them to rate the patient. Per previous decision, patients are NOT rated.

**Files:**
- `src/pages/Sessions.tsx` (~lines 595-605): Remove the `StarRatingDialog` component and its state (`showStarRating`)
- `src/pages/SessionDetail.tsx` (~lines 93-94, 293-302, 327-337): Remove "Rate Visit" button and `StarRatingDialog` for `raterRole="doctor"`
- Keep `StarRatingDialog` in `Notifications.tsx` (that's where patients rate doctors)

## 3. Rename Todo Titles: "Review & Send" → "Review [DocType] - [PatientName]"

**Problem:** Todo titles say "Review & Send: Invoice - Shannon Kennedy". Should say "Review Invoice - Shannon Kennedy" since the Send icon is self-explanatory.

**File:** `src/hooks/useSessions.ts`
- Line 394: `Review & Send: Hospital Admission` → `Review Hospital Admission`
- Line 479: `Review & Send: Prescription` → `Review Prescription`
- Line 569: `Review & Send: Medical Certificate` → `Review Medical Certificate`
- Line 659: `Review & Send: Referral Letter` → `Review Referral Letter`
- Line 740: `Review & Send: Invoice` → `Review Invoice`
- Line 794: `Review & Send: Patient Tasks` → `Review Patient Tasks`

Also update label in `CompactTodoList.tsx` and `TodoList.tsx`: `document_review: "📄 Send document"` → `"📄 Review document"`

## 4. Fix "End Session" Not Ending Recording

**Problem:** The `endPhrases` check runs inside `onTranscriptionComplete`, but the live transcript in the recording panel (line 894) renders as a single `<p>` tag without parsing speaker labels. The transcription returns text like `Dr. Smith: ... Patient: ...` and the end-phrase detection checks the last 150 chars, which works. However, the issue is that `stopRecording()` is called while inside the `onTranscriptionComplete` callback — the MediaRecorder may already be in a `stopping` state from chunk processing.

**Fix in `src/pages/Sessions.tsx`:** Instead of calling `stopRecording()` directly inside the callback, wrap it in `setTimeout(() => { if (isRecording) stopRecording(); }, 100)` to ensure it runs outside the current event loop. Also add `'end the session'` and `'session ended'` to `endPhrases` for broader detection.

## 5. Restore Transcription Color Coding

**Problem:** The live transcript panel (line 892-898) renders all text as a single `<p>` without speaker-based color coding. The completed session view (lines 996-1006) correctly parses speakers, but the live view does not.

**File:** `src/pages/Sessions.tsx` (lines 892-898)
- Replace the single `<p>` with the same speaker-parsing logic used in the completed view (lines 996-1008): split by `\n`, detect speaker prefix, color doctor lines with `text-primary` and patient lines with `text-foreground`

## 6. Add All Document Types as Post-Session Options (Not Just Prescription & Invoice)

**Problem:** After session completion, only Prescription and Invoice cards are shown (lines 1065-1137). All document types should be available.

**File:** `src/pages/Sessions.tsx` (lines 1065-1137)
- Replace the 2-card grid with a dropdown `Select` component listing all 6 document types: Prescription, Invoice, Medical Certificate, Referral Letter, General Letter, Hospital Admission
- Add a "Create Document" button next to the selector
- When selected and clicked, open the corresponding editor

## 7. Add Preview (Eye) Icon to Dashboard CompactTodoList

**Problem:** The full TodoList page has Eye/FileText/Send icons for document_review tasks, but the Dashboard `CompactTodoList` widget only shows FileText and Send on hover. Missing the Eye preview icon.

**File:** `src/components/dashboard/CompactTodoList.tsx`
- Import `Eye` icon
- Add `handlePreviewDoc` logic (fetch document, get template with header/footer, show preview)
- Import `DocumentPreview` component
- Add Eye button before FileText in the hover actions (line 419)
- Add `previewDoc` state and render `DocumentPreview` modal

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/PatientProfile.tsx` | Add Compare Images button + dialog for doctors |
| `src/pages/Sessions.tsx` | Remove StarRating, fix end-session timing, color-code live transcript, expand post-session document options |
| `src/pages/SessionDetail.tsx` | Remove "Rate Visit" button and StarRatingDialog |
| `src/hooks/useSessions.ts` | Rename "Review & Send" → "Review" in todo titles |
| `src/components/dashboard/CompactTodoList.tsx` | Add Eye preview icon + DocumentPreview modal |
| `src/pages/TodoList.tsx` | Update document_review label |

