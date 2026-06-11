# Plan: Briefing onboarding tip + remove SMS (keep phone as identifier)

## 1. Add "Today's Briefing" onboarding tip

In `src/components/tour/tourSteps.ts`, insert a new step in `doctorTourSteps` before `doctor-tasks`:

```ts
{
  target: "doctor-briefing",
  title: "Today's Briefing",
  message:
    "Your morning briefing summarises overnight patient activity. Tap play to hear it narrated, or read it inline. Use Skip on any item that isn't relevant — it won't come back tomorrow. Change Language in My Practice settings.",
}
```

Add `data-tour="doctor-briefing"` to the briefing card container on the doctor home dashboard (the component in `doctor-dashboard/briefing-and-activity-layout`). `TourProvider`/`ArrowCallout` already no-op when a target isn't mounted.

## 2. Remove SMS — keep phone as a sign-in identifier, verify via authenticator app

Standardise on **TOTP (QR/authenticator) as the only second factor**, regardless of whether the user signs up with email or phone. No SMS provider is configured and none will be invoked.

### Sign-up (`src/pages/Auth.tsx`)
- **Keep** the Email / Phone toggle on the sign-up step (both doctor and patient branches).
- **Email branch** — unchanged: `supabase.auth.signUp({ email, password, options })`.
- **Phone branch** — change behaviour:
  - Continue collecting `phone` (+ country code) and `password`.
  - Call `supabase.auth.signUp({ phone, password })` **only after disabling Supabase's phone confirmation** so it never tries to send an SMS (see §3). The account is created in an unconfirmed-phone state, but our app treats the phone purely as a login identifier — not a verified channel.
  - Immediately sign the user in with `signInWithPassword({ phone, password })`, then send them through the existing `MfaGate` → `MfaEnrollScreen` flow, which enrolls a TOTP factor (QR code) as the *only* form of second-factor verification.
  - Remove any "We just texted you a code" / phone-OTP entry UI from the signup step.

### Sign-in (`src/pages/Auth.tsx`)
- Keep the unified identifier field that accepts **either email or phone**.
- Always use password sign-in: `signInWithPassword({ email | phone, password })`.
- Remove every `signInWithOtp({ phone })` / `verifyOtp({ phone })` call path and the associated "Send code" / "Enter code" UI.
- After password sign-in, `MfaGate` enforces TOTP via authenticator app — same flow for email and phone users.

### `src/hooks/useAuth.ts`
- Leave `signInWithOtp(email)` and `verifyOtp(email)` in place only if other screens still use them for *email* magic-link flows; remove if unused. No phone variants are added.

### 2FA screens
- `MfaEnrollScreen`, `TwoFactorSetup`, `MfaChallengeScreen`, `MfaGate` — **untouched**. QR code + 6-digit TOTP remains the single second-factor method for everyone.

## 3. Backend auth settings

Use `supabase--configure_auth` (or equivalent) to ensure phone-confirmation / SMS provider is **off** so `signUp({ phone })` does not attempt to dispatch an SMS. Email confirmation setting stays as-is. No SMS provider, no Twilio, no edge function for SMS.

If Supabase still rejects `signUp({ phone })` without an SMS provider when phone confirmation is disabled, fall back to creating the account via email-as-identifier and storing the phone on `profiles.phone` only — but the first attempt is the cleaner phone-as-identifier path above.

## Files touched

- `src/components/tour/tourSteps.ts` — add briefing step.
- Doctor home dashboard briefing component — add `data-tour="doctor-briefing"`.
- `src/pages/Auth.tsx` — remove SMS OTP UI/code paths, keep phone identifier + password, route to TOTP enroll.
- `src/hooks/useAuth.ts` — trim only if exports are unused after the cleanup.
- Auth settings — disable phone confirmation so no SMS is ever sent.

## Out of scope

- Configuring an SMS provider (explicitly not wanted).
- Changes to TOTP enroll/challenge screens (already finalised in Phase 1).
- Forgot-password / reset-password flows (unchanged).
