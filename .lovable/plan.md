

# Plan: Standardize All Frames to Teal Borders

## Problem
Settings.tsx consistently uses `border-primary` (teal) on all card frames, but many other pages still use `border-border` (gray). This creates visual inconsistency across the app.

## Pages that need `border-border` → `border-primary`

| File | Approximate occurrences |
|------|------------------------|
| `src/pages/MyPractice.tsx` | ~6 frames (profile card, personal info, practice details, referrals, pricing, certificates) |
| `src/pages/SessionDetail.tsx` | ~4 frames (not found, quick actions, audio recording, empty state) |
| `src/pages/Profile.tsx` | ~1 frame (no record found) |
| `src/pages/Documents.tsx` | Template cards + document list |
| `src/pages/CPDCertificates.tsx` | ~2 frames (form + table) |
| `src/pages/doctor/Invoices.tsx` | Edit/view invoice modals |
| `src/pages/patient/PatientCalendar.tsx` | Appointment cards, month cards |
| `src/components/dashboard/UpcomingAppointments.tsx` | Loading/content frame |
| `src/components/dashboard/RecentActivity.tsx` | Loading/content frame |
| `src/components/dashboard/TodaysBriefing.tsx` | Loading/content frame |
| `src/components/patients/PatientOverview.tsx` | Loading/empty frames |
| `src/components/sessions/*.tsx` | Document preview, letter editors |

## Change
Global find-and-replace of `border border-border bg-card` → `border border-primary bg-card` across all page and component files listed above.

Exceptions (keep `border-border`):
- Inner dividers / sub-borders within frames (e.g., `border-b border-border`)
- Input field borders
- Modal overlay containers where teal would be visually heavy
- Hover-only teal borders (e.g., `hover:border-primary/30` stays as-is)

## Files Modified
All files listed in the table above (~12-15 files), changing outer frame borders from gray to teal.

