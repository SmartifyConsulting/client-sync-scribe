# Switch auth emails to Resend

You've moved off ZeptoMail. The existing `auth-email-sender` edge function (used by Forgot Password and the OTP/magic-link sign-in) currently calls `supabase/functions/_shared/email.ts`, which posts to the ZeptoMail API. We'll repoint it at Resend via the Lovable connector gateway — no code in the frontend needs to change.

## Prerequisites

1. **Resend connector connected** in Lovable (you mentioned you've switched, so this should be done). If not, we'll connect it.
2. **Verified sender domain in Resend** — `holarchealth.com` must be verified there (DNS records added at your registrar). Until then, sends will only work to your own Resend account email or via `onboarding@resend.dev`.
3. **`RESEND_API_KEY` secret** present in the project (added automatically when the connector is connected).

## Changes

### 1. `supabase/functions/_shared/email.ts`
Rewrite the `sendEmail` implementation to POST to the Resend gateway instead of ZeptoMail:
- Endpoint: `https://connector-gateway.lovable.dev/resend/emails`
- Headers: `Authorization: Bearer ${LOVABLE_API_KEY}`, `X-Connection-Api-Key: ${RESEND_API_KEY}`
- Body shape: `{ from, to, subject, html, text, cc, bcc, reply_to }` (Resend format — note `reply_to`, not `replyTo`)
- Keep the existing `SendEmailInput` interface so callers (`auth-email-sender`, plus any other functions that import it) don't need to change.
- Default `from`: `Holarc Health <no-reply@holarchealth.com>`.

### 2. `auth-email-sender/index.ts`
No logic changes needed — it already calls `sendEmail()` from the shared module. It will automatically route through Resend once the shared module is updated.

### 3. Remove ZeptoMail-only env vars from logic
Drop `ZEPTOMAIL_API_TOKEN` / `ZEPTOMAIL_REGION` usage. (The secret can stay in storage harmlessly, or you can delete it later.)

### 4. Deploy
Redeploy `auth-email-sender` (and any other functions importing `_shared/email.ts`) so the new shared code takes effect.

## What stays the same

- `src/pages/ForgotPassword.tsx` and `src/pages/Auth.tsx` keep invoking `auth-email-sender` exactly as today.
- Branded HTML templates inside `auth-email-sender` are preserved.
- `verify_jwt = false` config for the function stays.
- Supabase's auto-confirm email setting stays on so Supabase never sends its own emails.

## Two quick confirmations before I build

1. **Sender address** — confirm `no-reply@holarchealth.com` from "Holarc Health", or give me a different one.
2. **Domain status in Resend** — is `holarchealth.com` already verified there? If not, sends will fail until DNS propagates. (We can still ship the code now and it will start working as soon as the domain verifies.)
