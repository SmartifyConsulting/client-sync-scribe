

# Document Preview, Task Icons, Sample Voice, and Share App Placement

## 1. Full Document Preview with Real Headers/Footers from To-Do List

**Problem:** When a doctor clicks the FileText icon on a document_review task, it navigates to `/documents?view=ID`. The preview should show the actual document with real header/footer template applied, not raw template placeholders.

**Solution:**
- In `src/pages/TodoList.tsx`, add a preview dialog that opens the `DocumentPreview` component inline
- Fetch the document content from `session_documents` table by `document_id`
- Use `useTemplateWithHeaderFooter` to get the header/footer and apply it to the document content before rendering
- Pass the doctor's logo URL and font family to `DocumentPreview`

**Task Action Icons (5 icons per document_review task):**
Replace the current 2-icon setup (FileText + Send) with 5 distinct icons:
1. **Eye** — Preview: opens full `DocumentPreview` modal with real headers/footers
2. **Edit3** — Edit document content: navigates to `/documents?view={document_id}` (existing behavior)
3. **Send** — Approve and send (existing green arrow behavior)
4. **Edit3 (pencil)** — Edit the task itself (existing edit task behavior, already present)
5. **Trash2** — Delete task (already present)

**File:** `src/pages/TodoList.tsx`
- Import `DocumentPreview`, `Eye` from lucide, `useTemplateWithHeaderFooter`
- Add state for `previewDoc: { content, title, logoUrl, fontFamily } | null`
- Add `handlePreviewDoc(todo)` — fetches document from `session_documents`, applies header/footer, opens preview
- Update the document_id action buttons section (lines 524-537) to show all 5 icons

---

## 2. Restore Sample Voice Button

**Problem:** The "Sample Voice" button was in the Voice Narration Settings under My Practice but appears to have been removed or never added. The SAMPLE_TEXTS and narrate-briefing edge function exist but the button to play a sample is missing.

**Solution:**
- In `src/pages/MyPractice.tsx` (lines 795-825, Voice Narration Settings frame), add a "Sample Voice" button after the voice selector dropdown
- On click, call the `narrate-briefing` edge function with the sample text from `SAMPLE_TEXTS` (defined in Settings.tsx) for the user's preferred language
- Play the returned audio

**File:** `src/pages/MyPractice.tsx`
- Add sample text constants (or import from a shared location)
- Add state for `playingSample`, `sampleAudioRef`
- Add a `Volume2` icon button labeled "Sample Voice" that invokes `narrate-briefing` with the sample text and selected voice, then plays the audio

---

## 3. Share App Button — Only on Settings and Dashboard

**Problem:** ShareAppDialog appears on Dashboard, Patients, and PatientDetailsEditor. It should only be on Settings and Dashboard top-right.

**Changes:**
- **`src/pages/Dashboard.tsx`** (line 242-244): Move ShareAppDialog to the top-right of the header (next to the date line), not below it
- **`src/pages/Settings.tsx`** (line 282-287): Add ShareAppDialog button to the header `flex` row on the right side
- **`src/pages/Patients.tsx`** (line 382): Remove `<ShareAppDialog />`
- **`src/components/patients/PatientDetailsEditor.tsx`** (lines 440-448): Remove the ShareAppDialog block

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/TodoList.tsx` | Add full document preview with headers/footers; 5 action icons per document task |
| `src/pages/MyPractice.tsx` | Add "Sample Voice" button to Voice Narration Settings |
| `src/pages/Settings.tsx` | Add ShareAppDialog to header top-right |
| `src/pages/Dashboard.tsx` | Reposition ShareAppDialog to top-right of header |
| `src/pages/Patients.tsx` | Remove ShareAppDialog |
| `src/components/patients/PatientDetailsEditor.tsx` | Remove ShareAppDialog |

