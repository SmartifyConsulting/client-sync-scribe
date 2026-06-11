## Goal

Mobile-friendly **email OR phone** auth with **mandatory** TOTP MFA. Every user must enroll a TOTP factor; any session without a verified factor is blocked from the app until enrollment completes. SMS verification stays bypassed (project setting).

---

## Part A — Unified Login ("Email or Phone Number")

**File:** `src/pages/Auth.tsx` (login view only)

1. Replace the Email input with one field labeled **"Email or Phone Number"** + Password (keep eye toggle + `tabIndex={-1}` forgot link).
2. Country-code picker (reuses existing `COUNTRIES`) auto-hides when input contains `@`.
3. Submit: `@` present → `signInWithPassword({ email, password })`; else normalize to E.164 → `signInWithPassword({ phone, password })`.
4. Errors: `invalid_credentials` → "Invalid credentials"; missing user → "Account does not exist"; otherwise raw message.

## Part B — Phone option on Signup

**File:** `src/pages/Auth.tsx` (Account step of existing wizard)

1. Toggle at top of step 0: **"Sign up with Email"** / **"Sign up with Phone"** (default Email).
2. Phone path: country picker + phone + password → `signUp({ phone: e164, password, options: { data: { full_name, role } } })`. Existing `handle_new_user` trigger creates the profile row.
3. `handleFinalSubmit` skips email-only side effects when signup was phone-based (patient insert uses `null` email).

## Part C — Mandatory MFA gate (the core change)

**New file:** `src/components/auth/MfaGate.tsx` — a top-level guard wrapping `<App />`'s authenticated routes.

Behavior on every authenticated session:
1. Call `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` + `mfa.listFactors()`.
2. Three states:
   - **No verified TOTP factor** → render `<MfaEnrollScreen />` full-screen. User cannot reach the dashboard until they enroll + verify. "Sign out" button available; nothing else.
   - **Verified factor exists AND `nextLevel === 'aal2'` AND `currentLevel !== 'aal2'`** → render `<MfaChallengeScreen />` full-screen asking for 6-digit code (`mfa.challenge` + `mfa.verify`). Cancel = `signOut()`.
   - **`currentLevel === 'aal2'`** → render children (the app).
3. Re-checks on `onAuthStateChange` so freshly-signed-in users hit the gate before any route renders.

**Wire-in:** wrap the existing authenticated route tree in `src/App.tsx` so every protected page sits behind `<MfaGate>`. Public routes (`/auth`, `/reset-password`, `/forgot-password`, `/legal`, `/track/...`) stay outside the gate.

**MfaEnrollScreen** reuses the existing `TwoFactorSetup` flow logic (enroll → QR + secret + verify) but rendered as a full page (not a dialog). Includes:
- QR image from `data.totp.qr_code`.
- Plain-text secret + **"Copy Secret Key"** button.
- Mobile helper: *"On a mobile phone? Copy this key and paste it into Google Authenticator under 'Enter a setup key'."*
- 6-digit input → `mfa.challenge` + `mfa.verify`. On success → gate re-evaluates → app loads.

**MfaChallengeScreen**: lists verified factors, runs `mfa.challenge({ factorId })`, accepts 6-digit code → `mfa.verify`. Toasts on failure, allows retry.

## Part D — Settings "Disable 2FA" removed

**File:** `src/components/settings/SettingsContent.tsx`

Because MFA is mandatory, replace the existing Disable button + `mfa.unenroll` call with a static badge: **"2FA is required for all accounts."** Keep the status row showing "Enabled". The setup dialog stays available only for re-enrolling a replacement device after admin unenroll (out of scope).

## Out of scope

- Google/OAuth login (Google flow already exempt from password but `MfaGate` still enforces TOTP on the resulting session).
- Recovery codes / admin unenroll tooling.
- Magic-link OTP, password reset, dev ER login, multi-step wizard beyond step 0 toggle.
- SMS provider configuration.
- No DB migrations, no RLS changes, no new edge functions.

## Files touched

- `src/pages/Auth.tsx` — unified login + phone signup toggle.
- `src/App.tsx` — wrap authenticated routes in `<MfaGate>`.
- `src/components/auth/MfaGate.tsx` — new mandatory gate.
- `src/components/auth/MfaEnrollScreen.tsx` — new full-page enrollment.
- `src/components/auth/MfaChallengeScreen.tsx` — new full-page challenge.
- `src/components/settings/SettingsContent.tsx` — remove Disable, show "Required" badge.
