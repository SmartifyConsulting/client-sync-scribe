## 1. Doctor "My Profile" swaps the whole menu (bug)

`src/components/layout/Sidebar.tsx` picks nav items with `(isPatient || isOnPatientRoute) ? patientNavItems : doctorNavItems`. The doctor's "My Profile" link points at `/patient/details?section=health`, so opening it flips the sidebar (and `BottomNav.tsx`, `TopBarIcons.tsx`, which use the same `isOnPatientRoute` check) into patient mode — the doctor menu disappears and it looks like you were logged into a patient profile.

Fix: when `role === "doctor"`, always render `doctorNavItems` (plus the Admin entry for admins) regardless of path. Same guard in `BottomNav.tsx` and `TopBarIcons.tsx`.

## 2. Field label/typography bump + horizontal layouts

Only "Personal Information" currently uses the compact horizontal row style (inline utility string at line 2443 of `PatientDetailsEditor.tsx` with `[&_label]:text-[11px]`).

- Extract it into one exported constant (`FIELD_GRID_CLASS`).
- Increase labels one step: `text-[11px]` → `text-xs`, keep bold. Inputs/selects stay `h-8 text-xs`.
- Apply to **Addresses**, **Employer**, **Emergency Contacts**, **Next of Kin**, and the **Medical Information** tab sections (Vitals, Current Medications, Conditions/Diagnoses, Surgeries, Family History, Insurance, Pharmacies) — edit mode and the read-only `ViewField` variant.
- `ViewField` becomes label-left / value-right so view mode matches.

## 3. Addresses side by side

Two-column grid: Physical Address left, Postal Address right, with the "same as physical" checkbox under the physical column. When ticked, the postal column shows a disabled mirrored value instead of collapsing so the layout doesn't jump. Single column on mobile.

## 4. Emergency Contacts header white when collapsed

`EmergencyContactsInline.tsx` defines its own trigger that only turns green with `data-[state=open]`. Every other section uses the shared always-green `SectionHeader`. Fix: export `SectionHeader` and use it there (`ShieldAlert` icon) so the header is green/white collapsed and expanded.

## 5. Patient list group headers (Patients page)

In `src/pages/Patients.tsx`:
- Increase the A–Z group header name font by two steps (currently `text-xs` → `text-base`), keeping the count badge subdued.
- Remove the per-group rounded frame/border so the groups read as one continuous list inside the outer card (drop `rounded-xl`/border wrappers on each group block; keep a single divider line between rows).

## 6. SAMPLE badge never appears

Verified: the `patients` table has **no `metadata` column** and `is_sample` is `false` for all 187 rows. So `isSamplePatient()` only ever matches its hardcoded name hints ("sharon kennedy", "john sample", …) — "John Smith" and the other seeded demo patients don't match, which is why no badge shows anywhere.

Fix:
- Drop the dead `metadata.source` check from `src/lib/samplePatients.ts`.
- Mark the seeded demo patient rows with `is_sample = true` (data update) so the badge is driven by real data instead of name guessing, and extend the name-hint list as a fallback for the remaining known demo names (John Smith etc.).
- Badge then renders in the patients list and anywhere else `isSamplePatient` is used.

## 7. Dr Buttons has no doctor profile view

Verified: `dr.buttons@smartify.co.za` has the `doctor` role but an empty `profiles` row (`full_name`, `specialty`, `practice_number`, `doctor_number`, `about_me` all null), so the profile screen renders blank. Seed demo details on that row — name "Dr. Buttons", a specialty, demo practice/doctor numbers and a short About Me.

### Technical notes
- Files: `PatientDetailsEditor.tsx`, `EmergencyContactsInline.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `TopBarIcons.tsx`, `pages/Patients.tsx`, `lib/samplePatients.ts`, plus two data updates (sample flags, Dr Buttons profile).
- No schema changes and no colour-token changes — sizing/layout only.
