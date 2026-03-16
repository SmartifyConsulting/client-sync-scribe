

# Comprehensive Feature Update Plan

## 1. Fix Login Page Doctor Name Load Time

**Problem:** The sidebar/header fetches the profile name after login, causing a visible delay.

**Fix in `src/components/layout/Sidebar.tsx` and `MobileHeader.tsx`:**
- The `useProfile` hook loads on mount. Add a skeleton/placeholder for the name while loading instead of showing "User".
- Optionally, cache the profile name in localStorage after first fetch to show instantly on subsequent loads.

---

## 2. Add Pharmacy Fields to Patient Record

**Database Migration:**
```sql
ALTER TABLE patients ADD COLUMN pharmacy_name text;
ALTER TABLE patients ADD COLUMN pharmacy_email text;
```

**Files Modified:**
- `src/hooks/usePatients.ts` — add `pharmacy_name`, `pharmacy_email` to Patient interface and toDbPatient
- `src/components/patients/PatientDetailsEditor.tsx` — add "Main Pharmacy" section with name and email fields under Medical Data
- `src/components/sessions/PrescriptionEditor.tsx` — add "Email to Pharmacy" button that sends prescription to `patient.pharmacy_email`
- Create/update edge function `send-document-email` to support pharmacy recipient type

---

## 3. Auto-Forward Claims on Invoice Paid

**File Modified: `src/pages/doctor/Invoices.tsx`** (or wherever invoice status is updated to "paid")
- When doctor marks invoice as paid, check if the patient has a `claims_email`
- If yes, automatically invoke `submit-insurance-claim` edge function to email the invoice to the claims address
- Show a toast confirming the claim was forwarded

---

## 4. Show Allergies Frame in Patient Overview

**Problem:** Allergies section exists but only renders after AI summary. It should always show as a standalone frame next to Conditions.

**File Modified: `src/components/patients/PatientOverview.tsx`**
- Move the Allergies section from being conditional on `summaryData` to always showing when `patient.allergies` has data
- Place it in the grid alongside the Conditions card (2-column layout: Allergies | Conditions)
- Keep the AI-generated allergy badges when available, fall back to raw `patient.allergies` text

---

## 5. Move Notes to General Notes Frame Under Next of Kin

**Problem:** Notes is a separate tab. User wants it as a frame under Next of Kin in the Details tab, and the Notes tab removed.

**Files Modified:**
- `src/pages/PatientProfile.tsx` — remove the "Notes" TabsTrigger and TabsContent
- `src/components/patients/PatientDetailsEditor.tsx` — add a "General Notes" card/frame after the Next of Kin section, containing the notes textarea with auto-save

---

## 6. Lighter Grey for Discontinued Medications and Symptoms

**File Modified: `src/components/patients/PatientOverview.tsx`**
- Change inactive medication/symptom styling from `opacity-60` to `text-muted-foreground/50` or similar lighter grey
- Apply `text-gray-400 dark:text-gray-600` class to inactive items for more visible dimming

---

## 7. AI Summary as Timeline Bullets

**File Modified: `src/components/patients/PatientOverview.tsx`**
- Update `renderSummary` to split the summary text by sentences/bullet points
- Render as a vertical timeline with date markers and bullet points instead of a single prose paragraph
- Request the AI edge function (`summarize-patient-history`) to return structured timeline data in addition to prose

**File Modified: `supabase/functions/summarize-patient-history/index.ts`**
- Update prompt to request timeline-formatted output with date-prefixed bullet points

---

## 8. Auto-Create Appointment from Session Transcription

**File Modified: `supabase/functions/summarize-session/index.ts`**
- Extend the AI prompt to also extract any discussed follow-up appointment details (date, time, reason)
- Return an `upcoming_appointment` field in the response

**File Modified: `src/pages/Sessions.tsx` or session completion handler**
- After session summary is generated, check for `upcoming_appointment` in response
- If found, create an appointment in the `appointments` table
- Send meeting invite email to patient using `send-document-email` edge function

---

## 9. Rename Lollipops to Moolas (M's)

**Global rename across ~14 files:**
- Replace all "Lollipop" → "Moola", "lollipop" → "moola", "🍭" → "Ⓜ️" (or a currency-style icon)
- Key files: `LollipopDisplay.tsx`, `LollipopReport.tsx`, `GamificationAdmin.tsx`, `PatientProfile.tsx`, `Auth.tsx`, `MyRewards.tsx`, sidebar nav, patient dashboard
- Rename component files: `LollipopDisplay.tsx` → keep filename but update display text, or rename components
- Update database references: `reward_type` values stay as-is in DB (backward compatible), but UI shows "Moola"
- Display as currency format: "M 5" or "5 M's"

---

## 10. Dropdown for Anatomy Parts Selection

**File Modified: `src/components/drawings/DrawingPad.tsx`**
- Replace the 5-tab anatomy panel with a single `<Select>` dropdown for category selection
- Categories: Face, Joints, Systems, Neuro, Plastic Surgery
- Show the asset grid below the dropdown based on selected category
- This saves space and simplifies navigation

---

## 11. Fix Anatomy Canvas Drag/Drop and Resize

**File Modified: `src/components/drawings/DrawingPad.tsx`**
- Make ALL element types (text, shapes, anatomy images) draggable and resizable, not just anatomy overlays
- Add visible selection handles (4 corners + 4 edges) when any element is clicked
- For anatomy images: add `object-cover` with overflow hidden for cropping effect
- Ensure resize handles are always visible when element is selected (not just on hover)
- Fix: text elements and shape elements currently can't be moved after creation — add select tool support for all element types

**Key fixes:**
- Selected element shows blue border + corner handles
- All elements support drag-to-move when select tool is active
- All elements support corner-drag-to-resize
- Images use `object-cover` + `overflow-hidden` for cropping

---

## 12. Audio/Video Capture Under Documents Tab

**Database Migration:**
```sql
-- Add media type support to documents or create new table
ALTER TABLE documents ADD COLUMN media_url text;
ALTER TABLE documents ADD COLUMN media_type text; -- 'audio', 'video', 'document'
```

**New Storage Bucket:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-media', 'patient-media', true);
-- Add RLS policies for authenticated users
```

**Files Modified/Created:**
- `src/pages/PatientProfile.tsx` — add audio/video recording buttons in Documents tab
- Create `src/components/documents/MediaCapture.tsx` — component with:
  - Audio recording (using MediaRecorder API, similar to existing `useAudioRecording`)
  - Video recording (using MediaRecorder with video stream)
  - File upload for existing audio/video files
  - Preview/playback of recorded media
- Documents list shows media entries with playback controls

---

## Database Migrations Summary

```sql
-- Migration 1: Pharmacy fields
ALTER TABLE patients ADD COLUMN pharmacy_name text;
ALTER TABLE patients ADD COLUMN pharmacy_email text;

-- Migration 2: Media support for documents
ALTER TABLE documents ADD COLUMN media_url text;
ALTER TABLE documents ADD COLUMN media_type text;
```

```sql
-- Storage bucket for patient media
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-media', 'patient-media', true);
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patient-media');
CREATE POLICY "Authenticated users can view media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patient-media');
CREATE POLICY "Users can delete their media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patient-media');
```

## Files Affected (Summary)

| Change | Files |
|---|---|
| Login name speed | `Sidebar.tsx`, `MobileHeader.tsx`, `useProfile.ts` |
| Pharmacy fields | `usePatients.ts`, `PatientDetailsEditor.tsx`, `PrescriptionEditor.tsx`, migration |
| Auto-forward claims | `Invoices.tsx` (doctor) |
| Allergies frame | `PatientOverview.tsx` |
| Notes → General Notes | `PatientProfile.tsx`, `PatientDetailsEditor.tsx` |
| Lighter grey inactive | `PatientOverview.tsx` |
| Timeline bullets | `PatientOverview.tsx`, `summarize-patient-history/index.ts` |
| Auto-appointment | `summarize-session/index.ts`, `Sessions.tsx` |
| Lollipops → Moolas | ~14 files (all lollipop references) |
| Anatomy dropdown | `DrawingPad.tsx` |
| Canvas fix | `DrawingPad.tsx` |
| Audio/Video capture | `PatientProfile.tsx`, new `MediaCapture.tsx`, migration |

