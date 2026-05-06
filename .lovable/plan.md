# Fix: Emergency provider lands on doctor dashboard

## Root cause

`nonastasia@gmail.com` (user `7d6c9029…`) **owns an ambulance provider record** (`Charlotte Maxeke…`, status `pending`) but has **no row in `user_roles`** and `profiles.role` is `null`.

So in `RoleBasedRedirect`:
- `isPatient` = false
- `isEmergency` = false (no `hospital_staff` / `ambulance_staff` / `blood_bank` role row exists)
- → falls through to `/doctor-dashboard`

The previous fix only worked for users who already had an emergency role row. The `register-emergency-provider` edge function never inserts that role row, so brand-new providers always look like "doctors" to the redirect.

`/provider` itself uses `ProviderGate`, which checks `holarchelp_hospitals.owner_id` / `holarchelp_ambulance_providers.owner_id` — that's the source of truth for "is this account an emergency provider".

## Plan

### 1. Grant the staff role on provider signup

`supabase/functions/register-emergency-provider/index.ts` — after the hospital/ambulance row is inserted, also insert into `user_roles`:
- hospital → `hospital_staff`
- ambulance → `ambulance_staff`

Use upsert / `on conflict do nothing` against `(user_id, role)` so re-runs are safe.

### 2. Backfill the existing user

One-off migration: insert `('7d6c9029-…','ambulance_staff')` into `user_roles` (idempotent), so Claire is routed to `/provider` on her next sign-in.

### 3. Make `RoleBasedRedirect` robust to missing role rows

`src/App.tsx` `RoleBasedRedirect` — in addition to checking `isEmergency`, also check provider ownership directly via the same query `ProviderGate` uses (or extract `useProviderAccess`). If `providerType` is set and user is not a doctor/patient → `<Navigate to="/provider" replace />`.

This guarantees that even if a provider's role row is somehow missing, ownership of a hospital/ambulance record alone is enough to route them correctly.

### 4. Verify

- Sign in as `nonastasia@gmail.com` → expect to land on `/provider` (will see "pending approval" gate content if status is still `pending`, which is correct).
- Doctor accounts unaffected (no provider row, no emergency role).
- Patient accounts unaffected.

## Out of scope

- Admin approval UI for `status: 'pending'` providers (already lives at `/admin/holarchelp-providers`).
- Any change to `ProviderGate` itself or the provider portal pages.
- No schema changes (uses existing `user_roles` + `app_role` enum values).

## Files to touch

- `supabase/functions/register-emergency-provider/index.ts` (insert role)
- `supabase/migrations/<new>.sql` (backfill Claire's role)
- `src/App.tsx` (`RoleBasedRedirect` ownership check)
