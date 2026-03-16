

# Multi-Feature Update Plan

## 1. Timeline Bullets with Dates
**File: `src/components/patients/PatientOverview.tsx`** (lines 132-156)

The AI summary timeline currently splits text by sentence endings and renders each as a bullet. The issue is bullets have no date — they're just text sentences.

- Update `renderSummaryTimeline` to parse date prefixes from the summary text. The AI prompt in `summarize-session` already returns chronological text. Extract date patterns (e.g., "Jan 15, 2025 -", "2025-01-15:") from each sentence and render them as bold date labels on the timeline bullet.
- If a sentence has no date, group it under the previous dated bullet rather than giving it its own bullet.
- Update the `summarize-patient-history` edge function prompt to instruct the AI to prefix each timeline point with a date.

## 2. Reorder Overview Badges: Allergy, Condition, Medication, Symptom
**File: `src/components/patients/PatientOverview.tsx`** (lines 374-513)

Currently the order is: Allergies + Conditions (row 1), Medications + Symptoms (row 2). Also the legend order is Medication, Symptom, Condition, Allergy.

- Reorder sections to: Allergies (full width or half), Conditions, Medications, Symptoms.
- Reorder the legend (lines 280-304) to match: Allergy, Condition, Medication, Symptom.

## 3. Details Screen — Match Overview Frame Styling
**File: `src/components/patients/PatientDetailsEditor.tsx`** (view mode, lines 248-400)

Currently uses plain `<div>` sections with just uppercase headers. The Overview uses `rounded-xl border border-primary bg-card p-5` framed cards.

- Wrap each section (Personal Info, Addresses, etc.) in `rounded-xl border border-primary bg-card p-5 shadow-sm` containers matching Overview's card styling.
- Add section header with icon inside each card, consistent with Overview's pattern.

## 4. Documents Tab — Move "Create New Document" Inline & Remove Upload Document
**File: `src/pages/PatientProfile.tsx`** (lines 383-395)

Currently: MediaCapture row, then a separate row with "Create New Document" + "Upload Document" buttons.

- Move "Create New Document" button to sit alongside the MediaCapture actions (Audio, Record, Upload File) on the same row.
- Remove the separate "Upload Document" button entirely since Upload File in MediaCapture handles documents, audio, and video.

## 5. Anatomy Image Cropping — Fix Object-Cover Cutting Labels
**File: `src/components/drawings/DrawingPad.tsx`** (lines 903-906, 955-956)

Both the thumbnail panel and canvas overlays use `object-cover` which crops labels off.

- Change `object-cover` to `object-contain` on both the anatomy thumbnail previews (line 905) and the canvas overlay images (line 956) so full images including labels are visible.

## 6. Drawing Pad — Make Shapes/Text Selectable, Movable, Resizable
**File: `src/components/drawings/DrawingPad.tsx`**

Currently only `anatomy` type elements get HTML overlays with drag/resize handles. Shapes and text are drawn directly on the canvas and cannot be interacted with afterward.

- Render `shape` and `text` type elements as HTML overlays (like anatomy), not just canvas draws.
- Add the same drag (handleElementDragStart) and resize (handleResizeStart) handlers to shape/text overlays.
- When in "select" tool mode, clicking on the canvas should check if the click hits a shape/text element and select it.
- Add delete capability for selected elements (delete key or trash button).

## 7. Move Templates Below CPD in Navigation
**File: `src/components/layout/Sidebar.tsx`** (lines 39-51)

Currently: `...Invoices, Templates, Referral Doctors, CPD`. Change to: `...Invoices, Referral Doctors, CPD, Templates`.

## 8. Alphabetic Patient Listing with Letter Index
**File: `src/pages/Patients.tsx`** (lines 78-96, 513-640)

- Sort `filteredPatients` alphabetically by surname (last word in name).
- Group patients by first letter of surname.
- Render an alphabet bar (A-Z) above or to the side of the list. Clicking a letter scrolls/jumps to that section.
- Each letter group gets a sticky header row showing the letter.

## 9. Referral Doctor Specialty Field
**File: `src/pages/ReferralDoctors.tsx`**

- Add a `specialty` dropdown using the existing `DOCTOR_SPECIALTIES` list from Profile.tsx, plus an "Other" option with free-text input.
- Display specialty in the table.

**Database Migration:**
```sql
ALTER TABLE referral_doctors ADD COLUMN IF NOT EXISTS specialty text;
```

## 10. CPD Certificate File Attachment
**File: `src/pages/CPDCertificates.tsx`**

- Add a file upload input to the CPD form for attaching certificate PDFs/images.
- Upload to a new `cpd-certificates` storage bucket.
- Save the URL in `certificate_url` column (already exists).
- Show a download/view link in the table for certificates with attachments.

**Database Migration (storage bucket):**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('cpd-certificates', 'cpd-certificates', true);
CREATE POLICY "Users can upload CPD certificates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cpd-certificates');
CREATE POLICY "Users can view CPD certificates" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'cpd-certificates');
CREATE POLICY "Users can delete CPD certificates" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cpd-certificates');
```

## 11. CPD Badge on Doctor Profile (Read-Only + Link)
**File: `src/pages/Profile.tsx`**

- Add a read-only CPD Points badge (gold Award icon + total points) on the Profile page.
- Include an "Add CPD Training" link/button that navigates to `/cpd-certificates`.
- Query `cpd_certificates` table for current user's total points.

## Summary of Files Modified

| # | Change | Files |
|---|--------|-------|
| 1 | Timeline dates | `PatientOverview.tsx`, `summarize-patient-history/index.ts` |
| 2 | Badge order | `PatientOverview.tsx` |
| 3 | Details framing | `PatientDetailsEditor.tsx` |
| 4 | Documents buttons | `PatientProfile.tsx` |
| 5 | Anatomy contain | `DrawingPad.tsx` |
| 6 | Shape select/move | `DrawingPad.tsx` |
| 7 | Nav reorder | `Sidebar.tsx` |
| 8 | Alpha patients | `Patients.tsx` |
| 9 | Referral specialty | `ReferralDoctors.tsx`, migration |
| 10 | CPD attachment | `CPDCertificates.tsx`, migration |
| 11 | CPD profile badge | `Profile.tsx` |

