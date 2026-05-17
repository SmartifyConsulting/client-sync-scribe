# Plan

## 1. Landing page — surface the Emergency Provider path
Currently the "Get Started" / "Get Started Today" buttons open a 2-option dialog (Healthcare Provider / Patient). There's no path to `/provider-signup` (hospital / ambulance).

- Update the role dialog in `src/pages/Landing.tsx` to a 3-option grid:
  - **Healthcare Provider** → `/auth?mode=signup&role=doctor`
  - **Patient** → `/auth?mode=signup&role=patient`
  - **Emergency Service Provider** (Hospital / Ambulance / ER) → `/provider-signup`
- Use the hospital + ambulance marker icons already in `src/assets/` for the new tile.
- Same dialog is reused by both the top-nav "Get Started" and the in-page "Get Started Today" buttons, so a single change fixes both.

## 2. Provider signup form — require Reg # + Google-picker Address
Edit `src/pages/ProviderSignup.tsx`:

- After **Organisation name**, add a required **Company registration number** field (text).
- After that, add a required **Address** field using the existing `AddressAutocomplete` component (`src/features/patients/components/AddressAutocomplete.tsx`), which already proxies through the `google-places-autocomplete` edge function — no new key needed.
- Submit the new `registration_number` and `address` to `register-emergency-provider` (the edge function already accepts both).
- Client-side validation: both required, trimmed, length-bounded.

## 3. Duplicate-prevention (hospital + ambulance)
Add intelligence at three layers:

**a) DB constraints (migration):**
- Add a normalisation helper `public.norm_text(text)` (lowercased, trimmed, collapsed whitespace).
- Add **unique partial indexes** so soft-deleted / rejected rows don't block legitimate retries:
  - `holarchelp_hospitals`: unique on `lower(registration_number)` where it's not null; unique on `(norm_text(name), norm_text(city))` where status in (`pending`,`approved`).
  - `holarchelp_ambulance_providers`: same pattern on `registration_number` and `(company_name, city)`.

**b) Edge function pre-check (`register-emergency-provider`):**
- Before creating auth user / inserting org, run a lookup and return a clear 409 with a friendly message if:
  - same `registration_number` already exists, OR
  - same normalised name + city already exists, OR
  - within ~250 m of an existing approved hospital with similar name (lat/lng comparison when supplied).
- Message: "A hospital with this registration number / name already exists. If this is your organisation, ask the existing administrator to add you, or contact support."

**c) Client-side soft check:**
- On blur of registration number, debounce-call a new lightweight read RPC `check_provider_duplicate(_type, _reg_no, _name, _city)` (SECURITY DEFINER, returns boolean + existing org name) so the user sees an inline warning before submitting.

## 4. Multiple administrators per hospital
The schema already has `holarchelp_hospital_members` and `holarchelp_ambulance_members`. We just need UX + invite flow.

- **DB**: add `role text default 'admin'` and `invited_email text`, `invite_token uuid`, `invite_expires_at`, `accepted_at` columns to both `_members` tables. RLS:
  - Owner OR existing admin member can `INSERT`/`SELECT`/`DELETE` other admins.
  - `is_hospital_admin(_hospital_id,_user)` helper (owner OR member with role='admin').
- **Edge function** `invite-hospital-admin`: validates caller is owner/admin, creates a pending member row + sends an email (existing Mailgun connector) with a magic link `/accept-admin-invite?token=…`.
- **Edge function** `accept-admin-invite`: on signed-in user with valid token, sets `linked_user_id`, `accepted_at`, grants `hospital_staff` role.
- **UI**: new "Administrators" tab in the hospital profile screen under `src/modules/holarchelp/pages/provider/hospital/` — list current admins, "Invite admin" dialog (email + name), revoke action. Same component reused for ambulance providers.

## 5. Files touched
- **Edit**: `src/pages/Landing.tsx`, `src/pages/ProviderSignup.tsx`, `supabase/functions/register-emergency-provider/index.ts`.
- **New migration**: dedupe indexes, helper functions, admin-member columns + RLS, `check_provider_duplicate` RPC.
- **New edge functions**: `invite-hospital-admin`, `accept-admin-invite`.
- **New UI**: `AdministratorsTab.tsx` + `InviteAdminDialog.tsx` under hospital provider pages, route for `/accept-admin-invite`.

## Technical notes
- The Google Places proxy (`google-places-autocomplete`) is already deployed and used by `AddressAutocomplete`; no new secret.
- Edge function uses `signUp` for verification email — unchanged.
- Duplicate index uses `WHERE status IN ('pending','approved')` so admin-rejected stubs can be retried.
- All new RPCs marked `SECURITY DEFINER` with `SET search_path = public` per project standard.
