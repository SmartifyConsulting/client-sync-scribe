## 1. Doctor values in prescription and session document previews

Verified cause: `src/hooks/useTemplateWithHeaderFooter.ts` (used by the Prescription, Invoice, Referral Letter, Medical Certificate and Hospital Admission editors) does its own mini token replacement — only `[PracticeNumber]`, `[DoctorNumber]`, `[DoctorName]`, `[PracticeAddress]`, re-inserting the raw bracket when a field is empty, and rendering `[DoctorSignature]` only when an uploaded signature *image* exists (typed signatures ignored).

Fix: use the shared `fillDocumentPlaceholders` resolver (already used by the template editors) so prescription previews show Doctor Name, Doctor Number / Registration Number, Practice Number, Practice Address, dates, and the signature (typed or uploaded) by default. Empty/unknown tokens render as quiet `___` instead of raw brackets. Same treatment for header/footer sections.

## 2. Header image upload error

Verified: the `logos` bucket exists, is public, has no size/MIME restriction, and has insert/update/delete policies scoped to the `auth.uid()/…` folder — storage is sound. `src/features/documents/templates/TemplateSectionEditor.tsx` swallows the real error and always toasts the generic "Failed to upload image".

- Surface and log the real error message.
- Sanitise the generated file name (safe lowercase extension, fall back to `png`).
- Fall back to embedding the image locally if storage upload still fails.
- Guard for a not-yet-loaded user before branching.
- Re-test and report the exact remaining error if any.

## 3. Patient accordion spacing and name size

- Remove the dividing lines between client accordion tabs.
- Add vertical spacing/padding between the rounded accordion frames.
- Increase the patient name in the accordion header by one font size.
- Keep the green expanded header styling and white text unchanged.

## 4. Seeded/demo data marker — why it keeps not showing, and the fix

It is entirely possible to mark seeded data. The reason past attempts didn't stick is that the marker was added to individual row components, while patients, referral search results, dashboard to-do groups, and SOS/fleet demo panels each fetch different columns and render different components — so a record only shows the marker where the sample flag happens to be selected and where that specific component was edited.

Fix it once, centrally:
- One shared helper that decides "is this seeded?" from any available indicator (`is_sample`/`is_demo` column, known demo names, demo metadata).
- One shared marker component: bold orange test-tube icon, rendered immediately before the record name.
- Ensure every relevant query selects the sample flag, with a known-demo-name fallback where the column isn't available.
- Apply across patient lists, patient headers, referral/doctor search results, dashboard and to-do patient groupings, and Renken/demo SOS incidents and fleet vehicles.

## 5. Doctor "My Profile" flashes the patient layout

Verified cause: `Sidebar.tsx:43` sends a doctor's "My Profile" to `/patient/details?section=health`, which lives inside `PatientAppLayout` (`App.tsx:214`). `useUserRole` starts with `role = null` and `loading = true` (`useUserRole.ts:12-14`), and `Sidebar.tsx:100-102` picks the nav set with `(!isDoctor && (isPatient || isOnPatientRoute))` — with the URL already on `/patient/`, this evaluates true for the first render, showing the patient nav, then flips back to the doctor nav once the role resolves. Because the route crosses layout groups, the sidebar remounts and refetches the role on every click, so the flash happens every time.

Fix:
- Gate the nav-set decision on `roleLoading` (the same pattern `AppLayout.tsx:31-33` already uses): while the role is loading, keep the previously-rendered nav set rather than defaulting to the patient branch.
- Persist the resolved role so a cross-layout navigation doesn't restart from `null` (cache it via the shared auth/role state instead of refetching from scratch on remount).

Result: clicking "My Profile" as a doctor goes straight to the doctor-context profile view with no intermediate patient layout.