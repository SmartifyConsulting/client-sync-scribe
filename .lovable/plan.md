## Goal

When a new emergency service provider signs up, they should receive a verification email and only be able to sign in after clicking the link. Admin still approves the provider record separately at `/admin/holarchelp-providers`.

## Where admin approves providers

Admin approval already exists at **`/admin/holarchelp-providers`** (`src/pages/admin/HolarcHelpProviders.tsx`). New signups appear there with `status: 'pending'`. Approving calls `holarchelp_approve_hospital` / `holarchelp_approve_ambulance`, which sets the record to `approved` and grants the `hospital_staff` / `ambulance_staff` role. No change needed here — just clarifying for the user.

## Why no email arrived

`supabase/functions/register-emergency-provider/index.ts` currently calls `auth.admin.createUser({ email_confirm: false })`. That creates the account silently and does **not** send any verification email. That's why `nonastasia@gmail.com` got nothing.

## Fix

### 1. Edge function: send a verification email on signup
In `supabase/functions/register-emergency-provider/index.ts`:
- After `auth.admin.createUser` succeeds, generate a signup confirmation link with `auth.admin.generateLink({ type: 'signup', email, password, options: { redirectTo: '<app>/auth?mode=login' } })`.
- Send that link to the provider's email. Two options — pick one based on what's already wired up:
  - **Preferred:** use `inviteUserByEmail` instead of `createUser` + `generateLink`. It creates the user and triggers Supabase's built-in confirmation email in one call. We pass `password` separately by updating the user after invite acceptance — OR switch the flow to "invite → set password on first login". Simpler but changes UX.
  - **Cleaner for current UX (keep password from form):** keep `createUser`, then call `generateLink` and send the link via the existing email infrastructure (Lovable Emails / `send-document-email`-style helper). Requires that the project's email domain is set up so Gmail accepts it.
- Recommended path: **`createUser` + `generateLink({ type: 'signup' })` + send email via Lovable Emails**, because it preserves the password the provider just typed.

### 2. Email delivery
The project has `RESEND_API_KEY` and a custom domain (`holarchealth.com`), but no auth email templates are scaffolded yet. To make Gmail reliably accept the verification email:
- Set up the Lovable Emails domain (subdomain like `notify.holarchealth.com`) and scaffold auth email templates so Supabase's confirmation email is sent through the verified sender. This will be triggered via the email-setup dialog in the implementation step.
- Once set up, the `generateLink` URL is wrapped in a branded "Confirm your email" template and sent automatically.

### 3. Login gate
`src/pages/Auth.tsx` already surfaces "Email not confirmed" errors from Supabase, so no change is required — once verification is enforced, unverified providers attempting to log in will see that message.

### 4. Resend verification (small UX add)
On the `ProviderSignup` success screen, add a "Didn't get the email? Resend" button that calls a small new edge function (`resend-provider-verification`) which re-runs `generateLink` for the email and re-sends it. Prevents support tickets like this one.

### 5. Admin visibility (tiny polish)
On `/admin/holarchelp-providers`, show an "Email verified ✓ / Pending ✉️" badge next to each pending provider so admin knows whether the contact has confirmed their email before approving. Pulled from `auth.users.email_confirmed_at` via a small SECURITY DEFINER RPC (admin-only).

## Files touched

- `supabase/functions/register-emergency-provider/index.ts` — generate + send verification link
- `supabase/functions/resend-provider-verification/index.ts` — **new**, public, rate-limited
- `supabase/functions/_shared/email-templates/signup.tsx` — branded confirmation email (created by auth-template scaffold)
- `supabase/functions/auth-email-hook/index.ts` — created by scaffold
- `supabase/config.toml` — register the new functions with `verify_jwt = false`
- `src/pages/ProviderSignup.tsx` — add "Resend verification" button on success state
- `src/pages/admin/HolarcHelpProviders.tsx` — show email-verified badge per pending row
- New SECURITY DEFINER RPC `get_provider_email_status(provider_id, type)` (admin-only) for the badge

## Out of scope

- Changing how admin approval works (it already exists at `/admin/holarchelp-providers`).
- Migrating to magic-link / invite flow (would lose the password the provider typed).
- Marketing emails or non-auth provider notifications.
