## Goals

1. Replace the 3-tab picker on the organisation signup page with a single dropdown listing all four organisation types — including the new **Pharmacy** option.
2. Email `info@georgiaadams.co.za` whenever a Hospital, Emergency Service, Insurance Company or Pharmacy applies, with one-click **Approve** and **Reject** buttons in the email.

Out of scope: doctor/patient signup (those stay on `/auth`), changing the existing vetting fields, redesigning the admin panel.

## Changes

### 1. Add Pharmacy as a provider kind

- Extend `ProviderKind` in `src/features/admin/components/ProviderVettingForm.tsx` to `"hospital" | "esp" | "insurance" | "pharmacy"`.
- The pharmacy uses the same vetting fields (org name, registration/license number, address, contact email/phone, admin name/email/phone, directors, license file). The insurance-type field stays hidden for pharmacy.
- Pharmacy applications insert into the existing `holarchelp_pharmacies` table.

### 2. Pharmacy schema additions (migration)

`holarchelp_pharmacies` is missing the columns the other provider tables already have. Migration adds:

- `contact_email`, `contact_phone` (already there)
- `admin_full_name`, `admin_email`, `admin_phone`
- `directors jsonb`
- `license_file_path`, `license_file_mime`, `license_file_size_bytes`

Also extend `check_provider_duplicate` RPC to accept `'pharmacy'` and add a public-safe view + read policies mirroring the hospital pattern. No new tables, so RLS/grants are additive only.

### 3. Replace tabs with a dropdown on `src/pages/ProviderSignup.tsx`

- Swap `<Tabs>` for a single `<Select>` labelled "Organisation type" with four options: Hospital, Emergency Service, Insurance Company, Pharmacy.
- Reuse the existing `ProviderVettingForm` below the dropdown.
- Add the pharmacy branch in `submit()` (insert into `holarchelp_pharmacies` with `name`, `address`, `common` payload).
- Update `kindLabel` and the duplicate-check call to handle `pharmacy`.

### 4. Approval-notification edge function (`notify-provider-application`)

New function in `supabase/functions/notify-provider-application/`:

- Invoked by `ProviderSignup.tsx` right after the provider row is inserted (before sign-out).
- Inputs: `{ kind, providerId, orgName, adminName, adminEmail, adminPhone, registrationNumber, address }`.
- Generates a single signed action token (random UUID stored in a new `provider_approval_tokens` table with `provider_id`, `kind`, `expires_at = now()+30 days`, `used_at`).
- Sends one email via the existing `_shared/email.ts` (Resend connector already configured) to `info@georgiaadams.co.za`:
  - Subject: `New {Kind} application — {Org name}`
  - Body lists applicant details + two prominent buttons:
    - **Approve** → `https://<app>/admin/provider-approval?token=...&action=approve`
    - **Reject** → `...&action=reject`
- Sets `verify_jwt = false` for this function (called immediately after sign-up before session attaches; the security gate is the token, not the JWT).

### 5. Approval handler

New public route `src/pages/admin/ProviderApprovalAction.tsx` (no admin login required — the token IS the auth):

- Reads `token` + `action` from the URL.
- Calls a new edge function `process-provider-approval` which:
  - Validates the token (exists, not used, not expired).
  - Looks up the provider row by `(kind, provider_id)`.
  - On approve: sets `status='approved'`, grants the correct role (`hospital_admin` / `esp_admin` / `insurance_admin` / `pharmacy_staff`) by inserting into `user_roles` for the row's `owner_id`. Reuses existing `holarchelp_approve_*` RPCs where present; calls `holarchelp_approve_pharmacy` for pharmacy.
  - On reject: sets `status='rejected'`.
  - Marks token `used_at = now()`.
- Page shows a success/failure card.

### 6. Migration (single file)

Adds in order:
1. Pharmacy column additions + duplicate-check RPC update + read-only `holarchelp_pharmacies_public` view refresh.
2. `provider_approval_tokens` table with RLS (no client access — service role only via the edge function), plus `GRANT` for `service_role`.
3. RPC `process_provider_approval(_token uuid, _action text)` as `SECURITY DEFINER` so the edge function can run it without a user session.

### Verification

- Build typechecks.
- Submit a Pharmacy application end-to-end; confirm row in `holarchelp_pharmacies`, email arrives at `info@georgiaadams.co.za` with two buttons, clicking Approve flips status and grants `pharmacy_staff` role, second click on the same link reports "already used".
- Repeat for Hospital/ESP/Insurance to confirm no regression.

## Files touched

- `src/pages/ProviderSignup.tsx` — tabs → dropdown, pharmacy branch, invoke notification
- `src/features/admin/components/ProviderVettingForm.tsx` — extend `ProviderKind`, hide insurance-only fields for pharmacy
- `src/App.tsx` — new public route `/admin/provider-approval`
- `src/pages/admin/ProviderApprovalAction.tsx` (new)
- `supabase/functions/notify-provider-application/index.ts` (new)
- `supabase/functions/process-provider-approval/index.ts` (new)
- 1 new migration (pharmacy columns, approval-token table, approval RPC, duplicate-check update)
