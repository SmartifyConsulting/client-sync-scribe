## Goal

1. Remove the contact/mobile phone number input from every signup form.
2. Turn on email verification so new users must confirm their email before signing in.

## Changes

### 1. `src/pages/Auth.tsx` (doctor + patient signup)
- Remove the "Mobile Number" field block in both `renderDoctorStep` (lines ~594–601) and `renderPatientStep` (lines ~679–686).
- Keep the `CountrySelector` but relabel its wrapper to "Country / Language" so we preserve language auto-detection (per project memory) without asking for a phone number.
- Drop `phone`, `mobileNumber`, `setPhone`, `setMobileNumber` state + draft persistence usage. Set `mobile_number: null` in the profile insert (instead of the constructed `fullPhone`).
- Remove `phone` references from any signUp `options.data` and from the patient/doctor record inserts that currently pass `phone: fullPhone`.

### 2. `src/pages/ProviderSignup.tsx` (emergency provider signup)
- Remove the `phone` state, the "Contact phone" input (lines ~219–222), and stop sending `phone` in the `register-emergency-provider` call.

### 3. `supabase/functions/register-emergency-provider/index.ts`
- Treat `phone` as optional (already optional today). No schema change needed — just stop relying on it. `contact_phone` columns stay nullable.

### 4. Email verification (auth setting)
- Call `configure_auth` with `auto_confirm_email: false` so Supabase sends the built-in "Confirm your email" message on signup and blocks sign-in until the user clicks the link. Other flags stay as-is.
- The custom Resend-backed `auth-email-sender` and the existing `ForgotPassword` flow already cover the email delivery path, so no edge-function changes are required.

### 5. UX copy
- In `Auth.tsx`, after a successful signup, show a toast/inline message: "Check your inbox to confirm your email before signing in."
- In `ProviderSignup.tsx`, the existing success toast already mentions "Verify your email" — leave as-is.

## Out of scope
- No database migrations (existing `mobile_number` / `contact_phone` columns remain, just nullable and unused at signup).
- No changes to profile pages where users can later add a phone if they wish.
- No changes to the Resend integration.

## Open question
The `CountrySelector` currently lives next to the phone input and feeds language detection. Confirm: keep it visible as a standalone "Country" field on the signup step, or remove it entirely and default language to browser locale?
