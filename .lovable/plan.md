# Plan: Public `/provider-signup` — Administrator becomes the owner

Resolves the blocker on item 1 of the cumulative plan. `holarchelp_hospitals.owner_id` and `holarchelp_ambulance_providers.owner_id` are `NOT NULL`, so anon can't insert a pending row. Fix: the **administrator signs up first**, then the pending provider record is inserted with `owner_id = administrator's auth.uid()`. No schema change needed.

## Flow on `/provider-signup`

1. Public visitor lands on the rewritten page (form embedded in a card, hero icon, page title kept, `mailto:` removed).
2. They fill the existing `ProviderVettingForm` (Hospital / ER variant) — green-framed Organisation + Administrator sections, "Same as Hospital" mirroring, license upload, 6-hour SLA banner. No changes to fields or validation.
3. On submit (new `mode="public"` branch in `ProviderVettingForm` / new submit handler on the page):
   a. `supabase.auth.signUp({ email: admin_email, password: auto-generated or manual, options: { data: { full_name: admin_full_name } } })` — administrator becomes the auth user. Email auto-confirm is already on, so a session is returned immediately.
   b. With that session, upload the license to `provider-licenses` at `pending/<new uid>/<timestamp>-<file>`.
   c. Insert the pending row into `holarchelp_hospitals` or `holarchelp_ambulance_providers` with `owner_id = data.user.id`, `status = 'pending'`, and all vetting fields exactly as `CreateTestUserDialog.createVetting` does today.
   d. Immediately sign the user back out (`supabase.auth.signOut()`) so they don't land in an authed area before approval — they have no role yet, and approval grants `hospital_staff` / `ambulance_staff` via the existing `holarchelp_approve_*` RPCs.
4. Show the form's green success state: "Application received — pending approval", 6-hour SLA, sign-in reminder using the password they chose, "Return to Home" button. No email is sent (notify domain abandoned).

## Why this works without a migration

- Existing RLS on `holarchelp_hospitals` / `holarchelp_ambulance_providers` already lets an `authenticated` owner insert their own pending row (`owner_id = auth.uid()`). Confirmed by the admin-side flow in `CreateTestUserDialog` working today.
- Existing `provider-licenses` bucket policy already lets authenticated users upload under `pending/<their uid>/...`.
- `holarchelp_approve_hospital` / `holarchelp_approve_ambulance` already grant the correct role to `owner_id` on approval — no changes there.
- No anon RLS, no nullable owner_id, no new table.

## Duplicate-prevention guardrail

Before sign-up, call the existing `check_provider_duplicate(_type, _reg_no, _name, _city)` RPC (security-definer, callable without auth context for read). If a match is found, show a blocking message ("An application with this licence/name already exists — contact onboarding@holarchealth.com") and do NOT create the auth user. Prevents orphaned auth accounts from typo retries.

## Password UX on the public page

- Default to auto-generated password (existing form toggle), shown once on the success screen with copy-to-clipboard, plus a note: "Save this password — your administrator will use it to sign in once approved."
- If user toggles off auto-gen, the existing manual password field is used (with the same eye/eye-off rules already in `PhoneNumberInput`/`Input` patterns — actually `Input` doesn't auto-add toggle; the form already shows manual_password as plain `Input`, matching the admin dialog, so we keep parity).

## Failure handling

- Auth sign-up fails (e.g. email already used) → toast "An account with this email already exists. Sign in first, then submit the application from your dashboard." Do not insert.
- Storage upload fails → delete the just-created auth user is not possible client-side; show error and instruct user to retry — the orphaned auth user can re-sign-in and resubmit.
- Pending row insert fails → same as above.

## Files changed

- `src/pages/ProviderSignup.tsx` — rewrite: render `ProviderVettingForm` in a card, own the submit handler that does signUp → upload → insert → signOut → success state. Remove `mailto:` block. Keep header, hero icon, title, and bottom "I already have an account — sign in" button.
- `src/features/admin/components/ProviderVettingForm.tsx` — add optional `mode?: "public" | "admin"` prop. When `public`, hide the "Email credentials to administrator" toggle (no email infra), keep everything else identical.
- No migration. No edge function. No changes to `CreateTestUserDialog`, admin review dialog, or approval RPCs.

## Out of scope

- No email notifications (notify domain remains abandoned).
- No changes to vetting form fields, green frames, country-code phone input, "Same as Hospital" mirroring, admin review, mobile nav, or any item already shipped from the previous plan.
