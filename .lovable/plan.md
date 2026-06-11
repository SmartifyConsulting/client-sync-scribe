## Goal

Make TOTP 2FA mandatory: every user must enroll an authenticator app and pass a 6-digit code on every sign-in. Phone-signup users additionally get 8 one-time backup codes (email users do not — they can recover via email reset).

## Why TOTP and not SMS

Supabase Auth supports TOTP and Phone-OTP factors. SMS factors require a configured SMS provider, which this project intentionally avoids (phone signup uses synthetic email, no SMS). TOTP works for every user, online or offline, no carrier dependency, no per-message cost.

## Flow

### Signup (new users)
1. User completes existing signup wizard → account created.
2. Immediately routed to **new** `/mfa-setup` screen instead of dashboard:
   - QR code + manual secret (Supabase `mfa.enroll({ factorType: "totp" })`).
   - User scans in Google Authenticator / Authy / 1Password / etc.
   - Enters first 6-digit code → `mfa.challengeAndVerify(...)`.
3. If `signupMethod === "phone"`: show 8 single-use backup codes, force "I've saved these" checkbox + downloadable .txt. Codes hashed (bcrypt) and stored in existing `mfa_backup_codes` table.
4. Redirect to dashboard. Session is now AAL2.

### Sign-in (every time)
1. Email/phone + password → `signInWithPassword` → AAL1 session.
2. Client checks `mfa.getAuthenticatorAssuranceLevel()`:
   - `nextLevel === "aal2"` and `currentLevel === "aal1"` → route to `/mfa-verify` (full screen).
   - User enters 6-digit code → `mfa.challengeAndVerify(...)` → AAL2 → dashboard.
   - "Lost your authenticator? Use a backup code" link (phone users only) → 8-char code path that consumes one row from `mfa_backup_codes` via a SECURITY DEFINER RPC, then admin-resets the factor.
3. If no factor enrolled yet (existing users), route to `/mfa-setup` instead (forced enrollment).

### App-wide guard
`ProtectedRoute` (or equivalent) checks AAL on every render. If `aal1` and user has factors → redirect to `/mfa-verify`. If `aal1` and no factors → redirect to `/mfa-setup`. Only `/auth`, `/mfa-setup`, `/mfa-verify`, `/forgot-password`, `/reset-password` are exempt.

## Files

### New
- `src/pages/MfaSetup.tsx` — QR + verify + (phone-only) backup-codes section. Uses `qrcode.react` (already a common dep; bun add if missing).
- `src/pages/MfaVerify.tsx` — 6-digit input + "use backup code" link for phone users.
- `src/lib/mfa.ts` — helpers: `getAal()`, `getFirstUnverifiedFactor()`, `enrollTotp()`, `verifyChallenge(code)`, `generateBackupCodes()`, `consumeBackupCode(code)`.
- `supabase/functions/mfa-backup-recover/index.ts` — edge function, validates user JWT, hashes input, finds + marks-used a backup code row, then `admin.mfa.deleteFactor()` so the user can re-enroll on next login. Requires SERVICE_ROLE (admin Supabase client).

### Edited
- `src/pages/Auth.tsx` — after `handleFinalSubmit` success, `navigate("/mfa-setup")` instead of `routeAfterLogin`. After `handleLogin` success, check AAL and route to `/mfa-verify` or `/mfa-setup` instead of dashboard.
- `src/components/ProtectedRoute.tsx` (or wherever the auth gate lives — confirm during build) — add AAL2 enforcement.
- `src/App.tsx` — register `/mfa-setup` and `/mfa-verify` routes (public, but require an active session).

### Database (migration)
- `mfa_backup_codes` already exists (5 cols, 1 policy) — verify columns: `user_id`, `code_hash`, `used_at`, `created_at`. Add missing columns/index if needed.
- New SECURITY DEFINER function `public.consume_mfa_backup_code(_code_hash text)` returning boolean — atomic mark-used.
- No new tables for the factor itself; Supabase manages factors in `auth.mfa_factors`.

## Backup-code mechanics (phone users only)

- 8 codes, format `XXXX-XXXX` (8 chars, base32-ish, no ambiguous chars).
- Generated client-side at enrollment, **shown once**, sent to edge function which bcrypt-hashes and inserts 8 rows.
- Recovery: user enters one code on `/mfa-verify` → edge function `mfa-backup-recover` checks each unused hash, on match marks `used_at = now()`, deletes the user's TOTP factor via admin API, returns success. Client then routes to `/mfa-setup` to re-enroll a fresh authenticator (since the device is presumably lost).
- Email users see no backup-code UI; if they lose their authenticator they go through password reset → admin support (out of scope to automate).

## Out of scope

- WebAuthn / passkeys (could be a later upgrade).
- Per-device "remember this device for 30 days" — every sign-in re-prompts as you requested.
- SMS-based MFA.
- Bulk-resetting MFA for existing users via admin UI (admin can delete factors via existing edge function pattern if needed).
- Skipping MFA for the `dev_er@…` test login button — it will also need MFA. Confirm during build whether to exempt it.

## Open verification items (resolved during build, not blockers)

- Whether the project already has `qrcode.react`; if not, install it.
- Locate the existing route guard (likely `ProtectedRoute` or inside `App.tsx`).
- Confirm `mfa_backup_codes` column names before writing the recover RPC.
