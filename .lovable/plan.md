# UI polish + patient documents + medications + programs + profile switcher

## A. Profile switcher additions
Add **Okili** and **Dr Buttons** to `src/components/layout/testProfiles.ts` so they appear in the switcher for all seeded users.
Also whitelist their emails in `supabase/functions/admin-impersonate/index.ts` `SEEDED_EMAILS`.

**Blocker — need from you:**
- Okili: login email + role (Patient / Doctor / Hospital / ER Provider / Admin)
- Dr Buttons: login email + role

I'll add stub entries only if you send those; otherwise the "Signed in as … can't impersonate them" error will fire.

## B. Tab-view heading parity (My Practice matches Patient My Profile)
The tab-body headings in My Practice (e.g. "Practice Details", "Referral Doctors", "Credentials") currently render at `text-xs`, while Patient My Profile tab headings render at `text-base` (`h2` semantic).
- Update the section headings inside each `MyPractice.tsx` `TabsContent` to the same class stack used in `src/pages/patient/MyDetails.tsx` — typically `text-base font-semibold text-primary-dark` with a matching subtitle in `text-xs text-muted-foreground`.
- Applies to every My Practice sub-tab (Practice, Templates, Referrals, Credentials, Rewards) so all tab headers look identical to the patient side.

## C. Patient Documents — group by Type / Date, patient-authored CRUD
- Segmented toggle `[ By Type | By Date ]`, By Date default.
- **By Date**: accordion per `Month YYYY`, current month (`Jul 2026`) expanded, others collapsed.
- **By Type**: accordion per document type, all collapsed by default.
- Patient can `+ New Document`, plus Edit/Delete on rows they authored. Doctor-authored docs stay read-only.
- Verify RLS on `public.documents` for patient self-CRUD; add missing policies via migration only if needed.

## D. Medications & Programs (patient My Profile → Health)
- Rename **"Today's Medications"** → **"Current Medication"**, collapsed by default.
- Add **"Past Medication"** accordion — populated where `end_date < today` OR status discontinued/completed. Collapsed by default.
- Add **"Assigned Programs"** accordion (diets, exercises, rehab). Collapsed by default.
  - Check existing schema first; if no fit, migration for `patient_assigned_programs` (patient_id, assigned_by_doctor_id, title, program_type enum, description, start_date, end_date) with full GRANTs + RLS.

## E. Sub-tab styling (green bar, white text)
- My Profile → Holarchy inner tabs and Templates sub-tabs: inner `TabsList` → `bg-primary` with triggers `text-white data-[state=active]:bg-white data-[state=active]:text-primary-dark`.

## F. Accordion + label consistency (My Profile)
- Emergency Contacts wrapper → `border-neutral-400`.
- "Organ Donor" label in Medical Information → same class stack as sibling labels.

## G. Compact, classy form typography
Scoped to `.my-holarchy-tab-body` and `.my-practice-tab-body` in `src/index.css`:
- Labels: `font-weight: 700; font-size: 11px;`
- Inputs / selects / textareas / value spans: `font-size: 11px; font-weight: 600;`
- `input, select, textarea { height: 30px; padding: 4px 8px; }`
- Tighter rhythm within scope only.

## H. Calendar tweaks (Doctor calendar)
- Weekday headers `font-bold`.
- "Today" badge → `bg-primary text-white`.
- Top card: replace "Upcoming Appointment with {name}" with just `{name}`.

## I. Live AI diagnostic hint during recording
Diagnostic-first: verify hook/component mount while `isRecording === true`, poll fires on transcript-chunk updates, `live-session-hint` edge fn logs clean. Fix the broken link.

## J. Toast pacing
In `useSessions.ts` + `Sessions.tsx` finalisation, pass `{ duration: 6000, id: "<step-key>" }` so toasts persist ~6s and stack.

## K. To-Do List redesign (patient home)
- Remove document description; row = `[icon] [patient name] [meta chip] [actions]`.
- Legend strip at top (Document, Certificate, Appointment, Medication, Referral, Task).
- Medical Certificate → `Award` icon; Appointment → plain `Calendar` (no `Sparkles`).
- Patient name inline in `text-sm font-semibold`.

## Technical notes
- Colours via tokens only.
- Font/compaction rules scoped so unrelated screens are untouched.
- Doc CRUD: RLS check first; migration only if missing.
- Programs migration only if no existing table fits.
- Live-hint fix is diagnostic-first.

## Out of scope
- No palette changes, no top-level tab bar changes, no unrelated screens.

## Question
Send Okili's and Dr Buttons' login emails + roles so I can wire them into the switcher and impersonation allow-list.
