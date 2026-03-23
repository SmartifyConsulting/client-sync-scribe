

# Plan: Language Field, Nav Rename, Prescription Repeats, and Auto-Document Workflow Fixes

## Changes

### 1. Merge "Primary Language" + "Additional Languages" into single "Language" multi-checkbox field
**File:** `src/pages/MyPractice.tsx` (lines 608-642)
- Rename label from "Primary Language" to "Language"
- Remove the separate "Additional Languages" section
- Replace both with a single multi-checkbox chip toggle (like current Additional Languages), but using the `preferred_languages` array field to store all selected languages
- Default auto-select "English" if none selected
- Remove usage of `preferred_language` (single) field; consolidate into `preferred_languages` array only

### 2. Rename "My Practice" to "My Holarprac" and reorder in sidebar
**Files:** `src/components/layout/Sidebar.tsx` (line 42), `src/components/layout/BottomNav.tsx` (if applicable)
- Change label from `"My Practice"` to `"My Holarprac"`
- Move it below "My Holarchive" in `doctorNavItems` array (swap lines 42-43 order)

### 3. Add "Repeats" field to Prescription medication rows
**File:** `src/components/sessions/PrescriptionEditor.tsx`
- Add `repeats: string` to `MedicationItem` interface
- Add a "Repeats" input field in each medication row (e.g., "0", "1", "3" repeats)
- Include repeats in `generateContent()` output
- When AI auto-generates prescriptions (`useSessions.ts`), pass through `repeats` data from `summaryData.prescription` if mentioned in the session

### 4. Medical Certificate: Approve & Save (not Send), auto-generate as Review & Send todo
**File:** `src/components/sessions/MedicalCertificateEditor.tsx`
- Change save button label from "Send" to "Save" if it currently says Send
- Already auto-generated in `useSessions.ts` (lines 466-544) with `is_draft: true` and `document_review` todo — this is correct
- Verify the editor's save action does NOT auto-send emails; it should only save the document

### 5. Auto-generate invoice after each session as a Review & Send todo
**File:** `src/hooks/useSessions.ts` (after referral letter block, ~line 628)
- After session completion, always auto-generate a draft invoice document linked to the session
- Insert into `documents` table with `is_draft: true`, `template_name: 'Invoice'`
- Create a `document_review` todo: `"Review & Send: Invoice - {PatientName}"`
- Use the doctor's Invoice template if available, with placeholder replacements
- Documents must NEVER be auto-sent — only saved as drafts for manual review

### 6. Ensure all auto-generated documents are never auto-sent
**File:** `src/hooks/useSessions.ts`
- Verify all auto-created documents have `is_draft: true` (already the case)
- Verify no `email_sent_at` is set on auto-creation (already the case)
- No code change needed here — current implementation is correct

## Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Merge language fields into single "Language" multi-checkbox |
| `src/components/layout/Sidebar.tsx` | Rename "My Practice" → "My Holarprac", move below "My Holarchive" |
| `src/components/sessions/PrescriptionEditor.tsx` | Add "Repeats" field to medication rows |
| `src/hooks/useSessions.ts` | Add auto-invoice generation after session; include repeats in prescription auto-gen |
| `src/components/sessions/MedicalCertificateEditor.tsx` | Verify save button says "Save" not "Send" |

