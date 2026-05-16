# Switch auth emails to Mailgun

## Current state

Good news — most of the work is already in place:

- `supabase/functions/auth-email-hook/index.ts` already renders branded HolarcHealth emails and sends them through `_shared/mailgun.ts` (Mailgun connector), from `HolarcHealth <noreply@holarchealth.com>`.
- Required secrets are present: `MAILGUN_API_KEY` (connector) and `SEND_EMAIL_HOOK_SECRET`.
- Lovable's own auth email templates have NOT been scaffolded under `_shared/email-templates/`, so we're not double-handling auth mail.

What's missing is the Supabase Auth-side wiring that tells Supabase to call our hook for every auth email (signup, recovery, magic link, invite, email change, reauthentication). Until that's enabled, Supabase falls back to its built-in sender (the lovable.cloud "from" address you're seeing).

## Plan

1. **Redeploy `auth-email-hook`** to make sure the latest Mailgun version is live.
2. **Enable the Supabase Auth "Send Email" hook** pointing at this edge function, using `SEND_EMAIL_HOOK_SECRET` for signature verification. This is done via `supabase--configure_auth` (hook URI = the deployed function URL, secret = existing `SEND_EMAIL_HOOK_SECRET`).
3. **Verify** by triggering a password reset from `/auth` → confirm the email arrives from `noreply@holarchealth.com` (Mailgun) and Mailgun logs show delivery. If anything fails, check `auth-email-hook` logs.

## Out of scope / explicitly NOT doing

- Not scaffolding Lovable's auth email templates (`scaffold_auth_email_templates`) — that path would route through lovable.cloud infra, which is what you want to avoid.
- Not touching `_shared/mailgun.ts` — current sender domain `holarchealth.com` and `noreply@` address are correct.
- Not changing transactional (non-auth) email functions — they already go through Mailgun.

## Risk

The only risk is if `holarchealth.com` isn't fully verified in Mailgun (SPF/DKIM/MX). If sends fail with a Mailgun 401/forbidden error, you'll need to confirm the domain is verified in the Mailgun dashboard before auth emails work. I'll surface any such error from the function logs after the first test.
