## 1. Search + grouping on list screens

Add one shared toolbar component (`src/components/common/ListGroupToolbar.tsx`) used by Sessions, Tasks, Documents, Round Tables and Admissions:

- Search box (debounced, filters on title/patient/doctor/content depending on screen).
- Group-by selector: **Date (default)**, **Patient**, and **Hospital** (Hospital option only rendered for hospital-role users).
- Rendered as collapsible group accordions matching the existing green/white `section-accordion` styling, with count pills.

Date grouping buckets: **Today**, current month (e.g. "July 2026"), then earlier months, then years. Applies to patient Sessions view too.

Screens updated: `src/pages/MySessions.tsx` + `src/pages/doctor/Sessions.tsx`, `src/pages/TodoList.tsx`, `src/pages/Documents.tsx` / `DoctorDocumentsPage.tsx`, `DoctorRoundTablesPage.tsx`, `src/pages/doctor/DoctorAdmissions.tsx`.

## 2. Admissions CRUD for doctors

On the doctor Admissions screen, allow create / edit / delete of admissions inline (reusing `ManualLogAdmissionDialog` and `AdmissionsView` with `canEdit`), plus the same search/grouping toolbar.

## 3. Documents tabs styling

Change the Documents page `TabsList` (line ~370) to the standard app tab format used on My Profile: green `bg-primary` bar, white labels, white active pill with dark text, horizontally scrollable.

## 4. Patient profile fixes (`PatientDetailsEditor.tsx`)

- Rename the "My History" tab to **My Sessions** and remove the Admissions sub-tab from it (admissions stay reachable via the dedicated Admissions screen).
- Reduce accordion row label font by one step in **Personal Information** only.
- Fix the **Organ Donor** accordion so its expanded header is green with white text (convert it to the shared `SectionAccordion` used by the other rows).
- **Next of Kin**: prefill the phone field with the user's default country dial code; once a NOK is added, render the full record (name, relationship, phone, email, address) in the view list rather than a summary line.
- **Preferred Hospitals**: the Hospitals sub-tab exists in view mode but is missing from the edit-mode "My Holarchy" sub-tabs (line ~2196) — add it there so it is always visible.

## 5. Granular "Can view profile" permissions

Currently `patient_profile_shares` has only `can_view_profile` / `can_view_live_tracking` booleans.

- Migration: add a `view_scopes jsonb not null default '[]'` column.
- In `ProfileSharesSection.tsx`, when "Can view profile" is on, reveal a checkbox group: Medication, Sessions, Round Tables, Documents, Tasks, Calendar, Admissions, Insurance, Pharmacies, Hospitals.
- Shared-profile read paths filter sections by these scopes.

## 6. Legal Documents

New tab placed after Round Tables in the patient profile, backed by the existing documents/storage stack with a `legal` category and sub-type: **Organ Donor Document**, **Will**, **Do Not Resuscitate authorisation**, **Other**. Upload, view/preview, download and delete; visible to the patient and to providers holding the Documents scope.

## Technical notes

- One migration only (share scopes column); everything else is frontend.
- Grouping/search state stored in component state, group-by preference persisted to localStorage per screen.
- Hospital grouping keys off `hospital` / `hospital_provider_id` on admissions and off the session/document's linked facility where available.
