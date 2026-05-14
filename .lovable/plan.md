# Streamlined Signup + Post-Login Profile Nudge (All Roles)

## Goal

Every new user — patient, doctor, hospital, ambulance, or other emergency/service provider — should only have to enter the bare minimum to create an account, accept Terms & Conditions, and start their trial. All other profile/credential information becomes optional and lives inside their own profile screen, where they're nudged to complete it on every login until done.

---

## Current vs. New signup steps

### Patients (`/auth` → role = Patient)
Today: `[Account, Personal Info, Employment, Insurance, Next of Kin, Terms & Payment]`
New: `[Account, Terms & Payment]`

### Doctors / Healthcare Providers (`/auth` → role = Healthcare Provider)
Today: `[Account, Profile, Practice Info, Partners, Terms & Payment]`
New: `[Account, Terms & Payment]`

### Hospitals, Ambulance & other Service Providers (`/provider-signup`)
Today: multi-step form collecting org name, registration number, address, contact, services, etc., then T&Cs.
New: `[Account (org name + email + password + provider type), Terms & Payment]`

The four provider types follow the same rule: only auth + T&Cs at signup.

---

## What stays at signup (minimum data captured)

For every role:
- First / last name (or organisation name for hospitals/ambulance)
- Email
- Password
- Mobile number (already collected on Step 1 today)
- Role / provider type selector
- Acceptance of Terms & Conditions
- Trial / payment selection

Everything else (practice number, HPCSA number, partners, address, insurance, NOK, registration number, dispatch zones, etc.) is **deferred** to the in-app profile screen.

---

## Minimal record creation at signup

Each role's "home" record is still created at signup so the profile screen has something to edit:

- **Patient** → minimal `patients` row (`patient_user_id`, `full_name`, `email`)
- **Doctor** → existing `profiles` row already populated by the `handle_new_user` trigger; nothing extra needed
- **Hospital** → minimal `holarchelp_hospitals` row (owner_id, name, status='pending')
- **Ambulance** → minimal `holarchelp_ambulance_providers` row (owner_id, company_name, status='pending')

Status remains `pending` until the org completes credentials and an admin approves — same as today.

---

## Post-login behaviour

`RoleBasedRedirect` already routes:
- Patient → `/patient/details`
- Doctor → `/doctor-dashboard`
- Provider (hospital/ambulance/emergency) → `/provider`

No routing change. We add a **"Complete your profile" banner** at the top of each landing screen, shown whenever required-but-deferred fields are missing.

### Banner trigger fields per role

| Role | Considered "incomplete" if any of these are blank |
|---|---|
| Patient | DOB, physical address, mobile, ≥1 emergency contact |
| Doctor | Specialty, practice number, HPCSA/doctor number, practice address |
| Hospital | Registration number, physical address, contact phone, services list |
| Ambulance | Registration number, base address, contact phone, fleet/dispatch zones |

### Banner copy (same wording across roles, lightly adapted)

> **Help us serve you better.** Please complete your profile so the Holarc Health network has what it needs to deliver care safely and quickly. All information is encrypted in transit and at rest, accessible only to you and the parties you explicitly connect with. Holarc Health is HIPAA- and POPIA-aligned and never sells or shares your data.
>
> [Complete my profile →]

CTA scrolls to / opens the relevant section in each role's profile editor. Banner stays visible on every login until all required fields are filled, then disappears automatically. Dismissible per session.

---

## Files touched

- `src/pages/Auth.tsx` — shorten both `PATIENT_STEPS` and `DOCTOR_STEPS` to `[Account, Terms & Payment]`; drop the case 1–4 render branches and their state/draft persistence; ensure the minimal patient row is created on first signup.
- `src/pages/ProviderSignup.tsx` — collapse to `[Account, Terms & Payment]`; create the minimal hospital/ambulance row at signup.
- `src/pages/patient/MyDetails.tsx` — add `<ProfileCompletionBanner />` above `PatientDetailsEditor`; remove "ask your doctor" fallback for self-service.
- `src/pages/DoctorDashboard.tsx` (or wherever the doctor lands) — mount `<ProfileCompletionBanner role="doctor" />`.
- `src/pages/Provider*.tsx` (hospital + ambulance landing) — mount `<ProfileCompletionBanner role="hospital" | "ambulance" />`.
- `src/components/profile/ProfileCompletionBanner.tsx` (new) — single shared component, takes a `role` prop, computes incompleteness with one simple hook per role.
- Cleanup: remove the orphan client-side `INSERT into user_roles` in `Auth.tsx` that's been throwing 401 RLS errors — the `handle_new_user` trigger already handles role insertion server-side.

## Out of scope

- No DB schema changes (existing tables already allow nullable fields for everything we're deferring).
- Admin approval logic for hospitals/ambulance is unchanged.
- No change to login, password reset, email verification, or role assignment.

## Open questions

1. Should profile-incomplete users be **blocked** from any actions (e.g., a doctor can't be discovered in search until credentials are filled, or a hospital can't accept incidents)? Default = banner only, nothing blocked.
2. Banner placement on doctor dashboard — top of page above the briefing widget, or inline as a card in the activity feed?
