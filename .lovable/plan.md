## Goal
Temporarily turn off both email verification and TOTP authentication code prompts while the MVP is being tested. Users sign in with email + password only; no confirmation email, no 6-digit code, no enrollment screen.

## Changes

### 1. Disable email confirmation (Supabase auth)
Call `supabase--configure_auth` with `auto_confirm_email: true`. New signups become active immediately — no "check your inbox" step. Existing users are unaffected.
- `disable_signup: false`
- `external_anonymous_users_enabled: false`
- `auto_confirm_email: true`
- `password_hibp_enabled: true` (leave the leaked-password check on)

### 2. Disable the MFA gate
In `src/components/auth/MfaGate.tsx`, short-circuit `evaluate()` to always set status to `"ok"`. No enrollment, no challenge, no profile lookup. Keep the file (and the `mfa_required` preference) in place so re-enabling later is a one-line revert.

### 3. Hide the MFA controls in Settings
In `src/components/settings/SettingsContent.tsx` (Security section), wrap the 2FA row and the "Ask for a login code every time I sign in" toggle in a `MVP_MFA_DISABLED` constant set to `true`, so they don't render. "Change Password" and "Replay app tour" stay visible.

## Re-enable later
Flip three things back: re-run `configure_auth` with `auto_confirm_email: false`, remove the early return in `MfaGate.tsx`, and set `MVP_MFA_DISABLED = false` in `SettingsContent.tsx`.

## Out of scope
- No database migration (the `profiles.mfa_required` column stays)
- No changes to password reset, Google OAuth, or session persistence
- No changes to existing verified users' MFA factors (they're just never challenged)
