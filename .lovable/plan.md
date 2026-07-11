## 1. Default `[DoctorSignature]` above `[DoctorName]` in all templates

Signature substitution already works (`fillDocumentPlaceholders.ts` + `useTemplateWithHeaderFooter.ts` replace `[DoctorSignature]` with an `<img>` of `profile.signature_url`). The gap is that only the Referral Letter default template contains the placeholder. Update the seeded default templates in `src/hooks/useTemplates.ts` so every one shows the signature image immediately above the doctor's typed name:

- Medical Certificate — insert `[DoctorSignature]` line above `Doctor's Name: [DoctorName]`.
- Prescription — insert `[DoctorSignature]` above `Prescribing Doctor: [DoctorName]` (remove the "Signature: ............" line).
- General Letterhead — insert `[DoctorSignature]` above `[DoctorName]` (remove dotted signature line).
- Invoice — insert `[DoctorSignature]` above `[DoctorName]`.
- Hospital Admission Form — replace the dotted "Signature: ..." line with `[DoctorSignature]` above `[DoctorName]`.
- Referral Letter — already correct, leave as is.

Note on existing users: `fetchTemplates()` seeds any missing default templates but never rewrites templates a user already has. For the rollout we will also add a one-time reconcile: if a seeded default template's `content` still matches the old shipped string exactly (unchanged by the user) and lacks `[DoctorSignature]`, overwrite it with the new content. Custom edits are preserved.

## 2. New Holarc Health logo

Register `user-uploads://HHNewLogo.png` as a Lovable asset and point every existing `holarc-logo*.png` import at the new asset URL, without touching any width/height/positioning classes:

```
lovable-assets create --file /mnt/user-uploads/HHNewLogo.png \
  --filename holarc-health-logo.png > src/assets/holarc-health-logo.png.asset.json
```

Replace the `import ... from "@/assets/holarc-logo*.png"` lines in:
`src/components/layout/Sidebar.tsx`, `ProviderSidebar.tsx`, `ProviderAppLayout.tsx`, `PatientAppLayout.tsx`, `MobileHeader.tsx`, `src/components/auth/TwoFactorSetup.tsx`, `MfaEnrollScreen.tsx`, `BackupCodesScreen.tsx`, `src/pages/Landing.tsx`, `Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `NotFound.tsx`
— with `import holarcLogo from "@/assets/holarc-health-logo.png.asset.json"` and use `holarcLogo.url` as the `src`. All className/style attributes stay untouched, so sizing and position don't shift. Old `holarc-logo*.png` files stay on disk (untouched) so nothing else breaks.

## 3. Show Dean's hospital admission on Sharon's profile

Confirmed via database: one admission exists (`Mediclinic Cape Town`, 14 Apr 2026) linked to Sharon Elise Kennedy (`patient_id = 4b1032be…`) created by Dr Dean Allie. RLS allows both Dean (as `doctor_id`) and Sharon (via `patient_user_id`) to read it.

Two places need to render it:

a) **Doctor-side (Dean viewing Sharon)** — `PatientProfile.tsx` already renders `<AdmissionsView patientId={patient.id} …>` under the Admissions tab, and there is an older archived Sharon record (`bc6973cc…`) in the DB. If Dean lands on the archived Sharon by mistake the tab looks empty. Fix: in `usePatients`/the patient loader used by `PatientProfile`, when multiple patient rows share a `patient_user_id`, prefer the non-archived (name not ending in "(archived)") most-recently-updated row. This matches the existing project-memory duplicate-resolution pattern.

b) **Patient-side (Sharon viewing her own profile)** — the patient portal has no Admissions surface today. Add a "Hospital Admissions" section to `src/pages/patient/MyDetails.tsx` (below existing clinical sections) that renders `<AdmissionsView patientId={myPatientRecord.id} canEdit={false} />`. Read-only for the patient (no add/upload buttons). This uses the same hook and RLS already permits it.

## Verification

- `bunx tsgo` after edits.
- Playwright at 1280×1800: log in as Dean → open Sharon's profile → Admissions tab shows the Mediclinic Cape Town admission. Log in as Sharon → MyDetails shows the same admission read-only. Screenshot both.
- Open a new Medical Certificate / Prescription / Invoice preview and confirm the signature image renders above the doctor name.
- Visually confirm the new logo appears on Landing, Auth, Sidebar and MobileHeader at the same size/position as before.

## Out of scope

No schema changes, no RLS changes, no edits to header/footer templates, no changes to `signature_url` upload flow, no changes to `AdmissionsView` layout beyond passing `canEdit={false}` on the patient side.
