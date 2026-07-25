## Scope

A batch of UI polish across My Rewards, My Practice, My Sessions, Add Task, Documents (patient + doctor), Tasks (doctor), Hospital Admissions, Referral Doctors, and Credentials. No business logic changes — presentation only.

---

## 0. Audit pass (do first)
Before touching new work, walk every item in this plan and record its current state (DONE / PARTIAL / NOT DONE) with file:line evidence. Anything marked PARTIAL or NOT DONE gets picked up in this same turn. Explicitly re-check:
- Accordion green-when-open + white font applied everywhere listed (My Practice, Personal Information, Medical Information, My Sessions, Documents, Tasks) — not just some.
- Chevron on the right on every accordion.
- Counts sitting next to labels, not floating far-right.
- Light-grey hover on collapsed accordion rows AND template cards.
- Description slot below trigger bars where copy exists.
- Vulas logo 2x on standalone marks only.
- Heading + subtext font parity across tab views.
- Add Task composer redesigned.
- Documents parity + grouping + only-top-expanded default.
- Doctor Tasks default grouped by Today / This Week / This Month / 2026.

## 1. Footer alignment (new)
Every page footer must be **left-aligned with the screen heading** — i.e. share the same left padding / container gutter as the H1 of the page, not centered and not full-bleed.
- Audit the shared footer component(s) used across authenticated screens.
- Remove any `mx-auto` / `text-center` / independent container that pushes the footer out of alignment with the page heading column.
- Verify on: `/practice`, `/my-sessions`, `/documents` (patient + doctor), `/todo`, `/patient/*` tabs, Hospital Admissions, Referral Doctors, Credentials, My Rewards.

## 2. My Rewards — VULAS logo sizing
- `src/pages/patient/MyRewards.tsx`, `src/pages/doctor/DoctorRewards.tsx`: double every standalone VULAS logo. Do **not** enlarge the logo inside the combined count circle.

## 3. My Practice — accordion font consistency
- `src/pages/MyPractice.tsx`: normalize "Service Offerings & Pricing" trigger to match About Me / Personal Information / Practice Information (same font size, weight, icon size).

## 4. Tab heading normalization
- One shared pattern across Medical Information, Credentials, Referral Doctors, Hospital Admissions, My Sessions, Documents, Tasks: `text-base font-semibold` heading + `text-xs text-muted-foreground` subtext.

## 5. Hospital Admissions / Referral Doctors / Credentials
- Fix Hospital Admissions layout regressions.
- Reduce action buttons by one font size on all three pages.
- **Log Admission** and **Upload Admission** form buttons must use the exact same button format (variant, size, font size, padding) as the buttons inside the Doctor's My Practice tab views.

## 6. Global accordion standard (My Sessions style)
Apply across My Practice, Personal Information, Medical Information, My Sessions, Documents, Tasks:
- Flat bar with fine grey divider between rows.
- Chevron **always on the right**.
- Count of units **next to the label**.
- When expanded: `bg-primary` with **white** label, icon, chevron, count.
- Collapsed hover: light but visible grey (`hover:bg-muted` / `hover:bg-neutral-100`). Same hover on **template cards**.
- Padding below the bar for an optional short description (e.g. "Share a short pitch about your practice and approach. Patients see this when viewing your profile. Maximum 600 words.").

## 7. Add Task composer
- `src/pages/TodoList.tsx` and `src/components/dashboard/CompactTodoList.tsx`: green, always-active **Add** button as the primary entry point. Textarea / mic appear after Add is clicked. Reduces vertical space.

## 8. Documents — patient + doctor parity
- Same visual shell across `PatientDocuments.tsx`, `DoctorDocumentsPage.tsx`, `DoctorDocumentsTab.tsx`.
- Same header row (title, subtext, filters, group-by control).
- Doctor gains full CRUD on rows.
- Column header row above the list.
- Group by **Type** or **Date**; doctor adds **Patient**.
- Only the top accordion group expanded by default.
- Template cards use the light-grey hover from section 6.

## 9. Doctor Tasks grouping
- `src/pages/TodoList.tsx` (doctor view): default group by **Today / This Week / This Month / 2026**; toggle to **By Patient**.
- Only the first group expanded.
- Same green-when-open / white-font / grey-hover accordion rule.

---

## Files to touch
- `src/pages/patient/MyRewards.tsx`, `src/pages/doctor/DoctorRewards.tsx`
- `src/components/gamification/LollipopDisplay.tsx`
- `src/pages/MyPractice.tsx`
- `src/pages/MySessions.tsx`, `src/pages/Sessions.tsx`
- `src/features/patients/components/PatientDetailsEditor.tsx`, `EmergencyContactsInline.tsx`
- `src/pages/patient/MyDetails.tsx` (Hospital Admissions section)
- `src/features/sessions/admissions/ManualLogAdmissionDialog.tsx`, `UploadAdmissionDialog.tsx`
- `src/pages/ReferralDoctors.tsx`, `src/pages/CPDCertificates.tsx`
- `src/pages/TodoList.tsx`, `src/components/dashboard/CompactTodoList.tsx`
- `src/pages/patient/PatientDocuments.tsx`, `src/pages/doctor/DoctorDocumentsPage.tsx`, `src/pages/doctor/DoctorDocumentsTab.tsx`
- Template card components under Documents/Templates
- Shared app footer component(s) — align to heading column
- Shared: small `AccordionTriggerBar` helper (or shared class strings) so the green-when-open + right chevron + inline count + grey hover + description-slot rule is applied consistently.

## Out of scope
- No color palette changes.
- No data / RLS / edge function changes.
- No new routes.
