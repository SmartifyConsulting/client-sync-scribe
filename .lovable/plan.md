## Goal

Let the phone-signup account `2348167581572@phone.holarc.local` (profile "samuel 0koli", role: patient) switch between demo profiles from the avatar menu, exactly like the other test accounts.

## Current behaviour (verified)

- The account exists in auth with that email-style identifier, has a `patient` profile, and no `admin` role.
- `AccountMenu` only renders the "Switch profile" list when the signed-in user is an admin **or** their email appears in `TEST_PROFILES` (`src/components/layout/testProfiles.ts`). This account is in neither, so no switcher appears.
- Even if the list rendered, the `admin-impersonate` edge function would reject the request with "Admin role required", because it only allows switching for callers whose email is in its own hardcoded `SEEDED_EMAILS` set.

## Changes

1. `src/components/layout/testProfiles.ts` — add an entry for `2348167581572@phone.holarc.local` (name "Samuel Okoli (Phone)", role "Patient", HeartPulse icon). This both unlocks the switcher for that user and makes the account selectable as a target by other test users.
2. `supabase/functions/admin-impersonate/index.ts` — add the same address to `SEEDED_EMAILS` so the caller check passes, then redeploy the function.

No database, role, or RLS change is needed — this stays a normal patient account and gains no admin privileges; it just joins the demo switch list.

## Note

The switch list is a hardcoded demo allow-list in two places (client + edge function). If more accounts need this often, a follow-up could move the list into a single shared source, but that's outside this change.
