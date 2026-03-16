

# Multi-Feature Update Plan

## 1. Rename Navigation Items
**Files: `Sidebar.tsx`, `ReferralDoctors.tsx`, `CPDCertificates.tsx`**
- Sidebar: "Referral Doctors" → "Referrals", "CPD" → "Certificates"
- Update page titles in `ReferralDoctors.tsx` and `CPDCertificates.tsx` to match

## 2. Display Patient Names as "Last Name, First Name"
**File: `Patients.tsx`**
- In the patient table rows (line 619), format display as `Surname, FirstName(s)` by splitting name and rearranging
- Keep sorting logic as-is (already sorts by surname)

## 3. Collapsible Year Groups in AI Timeline
**File: `PatientOverview.tsx`**
- Parse year from each timeline item's date
- Group items by year
- Current year: expanded by default; previous years: collapsed with a clickable year header
- Assign distinct colors per year (e.g., primary, blue, amber, emerald, violet rotating)
- Use Collapsible component for expand/collapse

## 4. Narration Voice Preview
**File: `Profile.tsx`**
- Add a "Preview" button next to the voice selector
- On click, call the `narrate-briefing` edge function (or OpenAI TTS directly via a small edge function) with a short sample sentence like "Hello, this is your MediPad briefing voice."
- Play the returned audio in an `<audio>` element

**New edge function: `supabase/functions/preview-voice/index.ts`** — accepts `{ voice: string, text: string }`, calls OpenAI TTS, returns audio

## 5. Move Upload File Outside MediaCapture Frame
**File: `PatientProfile.tsx`, `MediaCapture.tsx`**
- Extract "Upload File" button from MediaCapture's Card into PatientProfile directly
- In PatientProfile, place buttons on same row centered: `Record Media` | `Upload File` | `Create New Document`
- All buttons middle-aligned with `justify-center`

## 6. Notifications → Dashboard Badge (Not Menu Item)
**Files: `Sidebar.tsx`, `Dashboard.tsx`, `PatientDashboard.tsx`, `App.tsx`**
- Remove "Notifications" from both `doctorNavItems` and `patientNavItems`
- Remove `/notifications` route from App.tsx
- Add a Bell icon with unread count badge to the Dashboard header (both doctor and patient)
- Clicking the bell opens a dropdown/popover showing recent notifications (invitations, document receipts only — no email)
- Mark as read on view
- Scope notifications to: invitations and document-received only

## 7. Rename Lollipops → Moolas Throughout
**Files: `usePatientRewards.ts`, `LollipopDisplay.tsx`, `GamificationAdmin.tsx`, `PatientDashboard.tsx`, `PatientOverview.tsx`, `LollipopReport.tsx`**
- Already renamed in display text to "Moola" in `LollipopDisplay.tsx`
- Rename variable names `lollipopCount` → keep as-is internally (DB columns unchanged), but ensure ALL user-facing text says "Moola(s)" instead of "Lollipop(s)"
- Update GamificationAdmin labels: "Lollipops Awarded" → "Moolas Awarded"

## 8. AI Action Items: Doctor vs Patient + Auto-Send
**File: `Sessions.tsx`, `summarize-session/index.ts`**
- Update AI prompt to tag each action item as `for: "doctor"` or `for: "patient"`
- For doctor action items that match auto-generated documents (prescription, med cert, invoice, referral), mark them as "draft ready" with a "Send" button
- Clicking "Send" marks the todo as done and sends/finalizes the draft document
- For patient action items, create todos assigned conceptually to the patient

## 9. Auto-Generated Documents Filed Under Patient Profile
**File: `Sessions.tsx`**
- When auto-generated prescription/invoice/med cert/referral is approved, ensure `patient_id` is set on the document record
- Add color-coded document type badges in patient Documents tab:
  - Prescription: blue, Invoice: amber, Medical Certificate: green, Referral: purple, General: gray
- Add a document type filter dropdown above the documents list

**File: `PatientProfile.tsx`** — Add filter select and color badges to document list

## 10. Fix Patient Import Horizontal Scrolling + Status Field
**File: `PatientImport.tsx`**
- The preview table container uses `overflow-auto` but may not scroll horizontally if content doesn't overflow. Wrap the `<Table>` in a `<div>` with `overflow-x-auto` and set `min-width` on the table
- Add a "Status" column to the preview table with default "active"
- Add `status` field to `ParsedPatient` interface, default to `"active"`
- Include `status` in the import insert (line 483 already hardcodes "active" — use `patient.status || "active"` instead)
- Add Status to column mappings and AI prompt

## 11. Reward Admin Page (Moola Allocation)
**File: `GamificationAdmin.tsx`**
- This page already exists at `/admin/gamification` — rename it to "Reward Admin" or "Moola Admin"
- Update all "Lollipop" labels to "Moola"
- Rename sidebar item from "Gamification" to "Rewards" in admin nav
- Ensure the page lets admins set Moola amounts per visit/interaction type (already functional)

## Summary of Files

| # | Change | Files |
|---|--------|-------|
| 1 | Nav renames | `Sidebar.tsx`, `ReferralDoctors.tsx`, `CPDCertificates.tsx` |
| 2 | Name display | `Patients.tsx` |
| 3 | Collapsible timeline | `PatientOverview.tsx` |
| 4 | Voice preview | `Profile.tsx`, new `preview-voice/index.ts` |
| 5 | Upload button move | `PatientProfile.tsx`, `MediaCapture.tsx` |
| 6 | Notifications badge | `Sidebar.tsx`, `Dashboard.tsx`, `PatientDashboard.tsx`, `App.tsx` |
| 7 | Moola rename | `GamificationAdmin.tsx`, `LollipopDisplay.tsx`, `PatientDashboard.tsx`, `usePatientRewards.ts` |
| 8 | Action item roles | `summarize-session/index.ts`, `Sessions.tsx` |
| 9 | Doc filing + badges | `Sessions.tsx`, `PatientProfile.tsx` |
| 10 | Import scroll + status | `PatientImport.tsx` |
| 11 | Reward admin | `GamificationAdmin.tsx`, `Sidebar.tsx` |

