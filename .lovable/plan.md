## Goal
Stop forcing TOTP MFA on every login. Make MFA opt-in per user, controlled from Settings.

## Current behavior
`src/components/auth/MfaGate.tsx` wraps every authenticated route and forces:
- Enrollment if the user has no verified TOTP factor
- A challenge (6-digit code) on every new session if a factor exists

That's why users see "authenticate" on every login.

## Proposed change

### 1. Add a per-user preference
- New column `profiles.mfa_required boolean not null default false`
- Migration to add the column; no backfill needed (default false = off)

### 2. Update `MfaGate`
- Read `profiles.mfa_required` for the current user
- If `false` (default): always render children — never trigger enroll or challenge
- If `true`: keep existing behavior (challenge on aal1 sessions, enroll if no factor)
- Signup / password reset flows are unaffected — those are normal Supabase auth, not MFA

### 3. Add a Settings toggle
In `src/components/settings/SettingsContent.tsx` (Security section), add:
- **"Require authentication code at every login"** switch, bound to `profiles.mfa_required`
- When turning ON: prompt user to enroll a TOTP factor immediately (reuse `MfaEnrollScreen` in a dialog). Only persist `mfa_required=true` after a factor is verified.
- When turning OFF: unenroll existing factors via `supabase.auth.mfa.unenroll()` for each verified factor, then set `mfa_required=false`. Show a confirm dialog ("This will reduce your account security").

### 4. Clean up existing forced enrollments
- Users who were force-enrolled keep their factor but `mfa_required=false`, so they won't be challenged. They can remove it from Settings.

## Out of scope
- No changes to password reset (`/reset-password` still works as today)
- No changes to signup, Google OAuth, or session persistence
- No changes to Supabase auth provider settings (HIBP stays on)

## Files touched
- `supabase/migrations/<new>.sql` — add `mfa_required` column
- `src/components/auth/MfaGate.tsx` — gate on preference
- `src/components/settings/SettingsContent.tsx` — add toggle + enroll/unenroll flow
- `src/hooks/useProfile.ts` (or equivalent) — expose `mfa_required`
