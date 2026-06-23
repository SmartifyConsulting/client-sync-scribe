## Plan

### 1. Fix country-code dropdown on the hospital / ESP onboarding form
**Bug:** In `PhoneNumberInput`, changing the country code before typing a local number silently fails. `onChange` calls `joinE164(dial, local)`, and `joinE164` returns `""` when `local` is empty — so the selected dial is discarded, and on next render `splitE164("")` falls back to `DEFAULT_DIAL`. The dropdown appears to "do nothing".

**Fix:** Track the selected dial locally inside `PhoneNumberInput` (state seeded from `splitE164(value)`) so the chosen country persists even before the user types a local number. Only emit `onChange` with a real E.164 string once a local number exists; otherwise emit `""` but keep the visible dial. Apply to both org phone and admin phone on `ProviderVettingForm`.

### 2. Cater for Hospitals, ESPs and Insurance Companies during sign-up
**Today:** `/auth` only offers Doctor and Patient. Hospitals/ESPs are hidden behind `/provider-signup`, and Insurance has no path at all.

**Change:**
- On the `/auth` sign-up screen, add an "Organisation" choice alongside Doctor/Patient. Selecting it routes the user to `/provider-signup` (preserving any `?invite=` / `?role=` params).
- Add a prominent secondary card on the login view: "Registering a hospital, emergency service or insurance company? → Onboard your organisation" linking to `/provider-signup`.
- Extend `/provider-signup` so the tabbed picker has **three** tabs: Hospital · Emergency Service Provider · Insurance Company.

### 3. Insurance Company provider type (new)
Insurance companies (life / disability income insurers) need to register so they can later verify patient history. This step covers registration + admin approval only; the patient-consent / history-access flow is a follow-up.

**Backend (one migration):**
- New table `public.holarchelp_insurance_providers` mirroring the shape of `holarchelp_ambulance_providers` (org name, registration_number, contact_email/phone, base_address, city, country, ownership, owner_id, license_file_path/mime/size_bytes, admin_full_name/email/phone, directors jsonb, status `holarchelp_provider_status`, rejection_reason, credential_score, tier, dispatch_priority dropped — not relevant). Plus `insurance_type text` enum-ish ("life", "disability_income", "both", "other").
- GRANTs: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`, `ALL` to `service_role`. No anon.
- RLS policies matching the hospital pattern:
  - owner can insert their own pending row,
  - owner can read/update their own row,
  - admins can read/update all rows,
  - approved rows are readable by `authenticated` (so search can find them).
- Add `'insurer_staff'` to the `user_role` enum.
- New RPC `holarchelp_approve_insurer(_provider_id uuid)` mirroring `holarchelp_approve_hospital` — sets status=approved and grants `insurer_staff` to the owner.
- Extend `check_provider_duplicate` to handle `_type = 'insurance'`.
- Storage: reuse the existing `provider-licenses` bucket; pending uploads go under `pending/<uid>/...` (existing policy already allows this).

**Frontend:**
- `ProviderVettingForm`: extend `ProviderKind` to `"hospital" | "esp" | "insurance"`; label adjustments ("Insurance Company" / "Insurer Administrator"); "Insurance type" select (Life / Disability income / Both / Other) shown only when kind is insurance.
- `ProviderSignup.tsx`: add the third tab and insert branch that writes to `holarchelp_insurance_providers`.
- Admin review (`PendingProviderReviewDialog` + `HolarcHelpProviders` admin page): add a third section listing pending insurers and wire the new approve RPC. (Reject already takes `_kind`; extend it to accept `'insurance'`.)

**Out of scope (flagged for a follow-up):** the actual patient-history verification flow that grants an approved insurer read-only access to a specific patient's record under explicit patient consent.

### 4. Make Sign Up more prominent on the login page
On the login view of `/auth` (not the existing `/provider-signup` page already done):
- Below the "Sign In" button, replace the small "Don't have an account? Sign up" link with a full-width outline `Button` ("Create an account") sized `lg`, plus a one-line helper ("Patients, Doctors and Organisations welcome").
- Keep tab order: Email → Password → Sign In → Create account → Forgot password (`tabIndex={-1}`).
- Mirror the same prominent CTA into the mobile login layout if it diverges.

### Files touched
- `src/components/forms/PhoneNumberInput.tsx` — local dial state.
- `src/features/admin/components/ProviderVettingForm.tsx` — third kind, insurance labels + insurance_type field.
- `src/pages/ProviderSignup.tsx` — third tab, insurer insert branch, duplicate guard arg.
- `src/pages/Auth.tsx` — Organisation choice on signup; prominent Create-account CTA on login; "Onboard your organisation" link.
- `src/features/admin/components/PendingProviderReviewDialog.tsx` + `src/pages/admin/HolarcHelpProviders.tsx` — list & approve insurers.
- One migration: `holarchelp_insurance_providers` table + GRANTs + RLS + `insurer_staff` enum value + `holarchelp_approve_insurer` RPC + `check_provider_duplicate` extension + `holarchelp_reject_provider` insurance branch.

### Not changed
No edits to existing approval flows for hospital/ambulance, no changes to `register-emergency-provider` edge function, no patient-consent / history-access logic yet.
