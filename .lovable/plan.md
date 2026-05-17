# Why password reset emails are still going via Lovable

The password reset you just triggered on `/forgot-password` calls Supabase's built-in `auth/v1/recover` endpoint. That endpoint decides who sends the email based on two things:

1. **Lovable Emails is currently enabled** on this project (`notify.nigeria.holarchealth.com`, status pending). While enabled, Supabase Auth is wired to Lovable's email pipeline for auth emails — your edge function is never called.
2. **The Supabase "Send Email" auth hook is not registered** to point at `auth-email-hook`. Even if Lovable Emails were off, Supabase would fall back to its default SMTP, not MailerSend.

Transactional sends (invoices, invitations, NOK notifications, PayPal receipts, etc.) **already go through MailerSend** via `_shared/email.ts` — but those only fire when those specific flows run. The forgot-password flow is an *auth* email, which is a different path.

## Fix plan

### 1. Disable Lovable Emails for this project
Call the toggle so Supabase Auth stops routing through Lovable's infra. This also removes the implicit takeover of auth emails.

Side effects to be aware of:
- Without a registered auth hook, auth emails would temporarily fall back to Supabase's default SMTP. We close that gap in step 2.
- No transactional impact — your app emails already use MailerSend directly, not Lovable's `send-transactional-email`.

### 2. Register `auth-email-hook` as the Supabase Send Email Hook
The hook URL and a webhook secret must be set in **Cloud → Auth → Hooks → Send Email Hook** (this is a one-time manual step in the Supabase Auth settings — there is no tool for it).

- Hook URL: `https://lqnnrvvrjscjceswpfal.supabase.co/functions/v1/auth-email-hook`
- Generate a secret (Supabase shows a "Generate secret" button — copy the `v1,whsec_...` value)
- Save the same value as the `SEND_EMAIL_HOOK_SECRET` runtime secret so the function can verify webhook signatures

### 3. Verify the MailerSend domain
`holarchealth.com` (or whatever sender domain you want in the `From:` header) must be verified in the MailerSend dashboard (SPF + DKIM). Until verified, MailerSend rejects every send and the hook returns 502 to Supabase, which then shows the user a generic "error sending recovery email".

If `holarchealth.com` isn't yet verifiable, switch `FROM` in `supabase/functions/auth-email-hook/index.ts` to a sender on whichever domain you have verified in MailerSend.

### 4. Test end-to-end
1. Trigger forgot-password from `/forgot-password`
2. Check **edge function logs** for `auth-email-hook` — should show `sending recovery to ...` and a 200 response
3. Check **MailerSend Activity** — should show the recovery email being accepted
4. Confirm receipt in the inbox

### 5. Optional cleanup
Once the hook is confirmed working end-to-end, we can also delete the unused `SEND_EMAIL_HOOK_SECRET` placeholder if a different name was used, and confirm no other code path still references Lovable's email infra.

## What I need from you to proceed

- **Confirm** you want me to disable Lovable Emails (step 1). I'll do this via tooling.
- **You** will need to do step 2 manually in the Supabase Auth Hooks settings (I can walk you through it, but no tool can register the hook for you).
- **Confirm** which sender domain is (or will be) verified in MailerSend so I can set the correct `From` address in the hook.
