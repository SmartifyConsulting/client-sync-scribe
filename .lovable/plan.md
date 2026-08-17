# Nurse Profile

## 1. Sidebar and naming

- The professional/patient pill next to the dashboard reads **Nurse | Patient** for nurses. The toggle already keys off the resolved role; make it also treat anyone with a linked `hospital_nurses` record as a nurse, so the badge never falls back to "Doctor" when a nurse's account also carries a clinician role.
- Nurses get **My Profile** in place of My Practice, pointing at a new nurse-only profile screen (not the patient details screen it currently opens).
- Greeting/labels address nurses as "Nurse Dlamini" rather than "Dr".

## 2. My Profile screen (nurses only)

Same header treatment as My Holarprac (photo card, name, save indicator), with a status line under the name: role title, ward, and a green Active dot. Below it, accordion sections:

1. **About Me** — free-text, same editor doctors have.
2. **Personal Information** — first name, last name, preferred name, professional title, employee / staff ID, professional registration number, current facility, current department / ward, online/offline status.
3. **Professional Information** — nursing category (Registered Nurse / Enrolled Nurse / Enrolled Nursing Auxiliary), registration number, registration authority, registration status, registration expiry, years of experience, areas of clinical experience, specialisations, languages spoken. Registration status shows as a coloured pill: ACTIVE (green), EXPIRING SOON (amber, within 90 days of expiry), EXPIRED (red) — derived from the expiry date.
4. **Employment** — facility / hospital, department, ward, position, reporting manager, employment status, employment start date.
5. **Clinical Permissions** — read-only for the nurse. Role, scope of practice, authorised wards/departments, authorised patient groups, medication administration, IV / infusion, procedures, assessments, escalation. Each line carries a status pill: AUTHORISED / NOT AUTHORISED / REQUIRES SUPERVISION. Helper text: "Your clinical permissions determine which clinical functions and patient information you can access within Holarc." Editable only by a hospital administrator.
6. **Certifications & Training** — card per certification: name, issuing organisation, date obtained, expiry, status (CURRENT / EXPIRING SOON / EXPIRED). Nurse can view and upload; only hospital admins can verify/approve. Seeded examples include Basic Life Support, Advanced Life Support, Infection Prevention & Control, Medication Management, Emergency Care.
7. **Current Assignment** — operational snapshot pulled live: current ward, shift, shift time, patients assigned, tasks outstanding, patients requiring attention, plus a **View My Patients** button to the nurse dashboard.
8. **Preferences** — notifications, language, communication preferences, appearance, accessibility. Voice Narration settings live here too. No clinical permissions in this section.
9. **Security & Access** — last login, active devices, password/authentication, two-factor status, session management, and "Sign out of all other devices". No technical/system detail exposed.

No patient clinical information appears anywhere on this screen — the page separates who the nurse is, what she is authorised to do, and what she is currently responsible for.

Fully responsive: single column stacking on mobile, two-column field grids from tablet up.

## Technical notes

- New page `src/pages/NurseProfile.tsx` at route `/nurse-profile`, guarded to nurses; sidebar `NURSE_BOTTOM_ITEMS` "My Profile" points here. Reuses `SECTION_*` accordion classes and `AboutMeAccordion` from MyPractice for design-system parity.
- Sidebar: `isNurse` widened to `role === 'nurse' || hasNurseRecord` (from `useNurseWard`), so the pill renders Nurse | Patient.
- Migration:
  - `hospital_nurses` gains preferred_name, professional_title, staff_id, nursing_category, registration_authority, registration_expiry, employment_status, employment_start_date, position, department, reporting_manager, years_experience, clinical_areas text[], specialisations text[], languages text[].
  - New `nurse_certifications` (nurse_id, name, issuer, obtained_on, expires_on, verified_by, verified_at) and `nurse_clinical_permissions` (nurse_id, permission_key, status enum authorised/not_authorised/requires_supervision, notes).
  - Both tables: GRANT to authenticated + service_role, RLS — nurse reads her own rows; hospital admins (`is_hospital_admin`) read/write for their hospital's nurses.
- Current Assignment reads existing ward/admission/task queries already used by `NurseDashboardScreen` via `useNurseWard`.
- Security & Access reuses the existing auth/MFA helpers; "sign out other devices" calls the global sign-out scope.
- New i18n keys under `nurseProfile.*` in `en.json`.
