# Switch email pipeline to MailerSend (no Mailgun references)

User preference: **no references to "mailgun" anywhere in the codebase** — file names, function names, variable names, comments, or env vars.

## 1. Secrets
- Add `MAILERSEND_API_TOKEN` (from mailersend.com → Integrations → API tokens)
- Remove unused: `RESEND_API_KEY`, `MAILGUN_API_KEY`, `MAILGUN_REGION`, `MAILGUN_CONNECTION_KEY`, `SEND_EMAIL_HOOK_SECRET`

## 2. New shared sender module
- Create `supabase/functions/_shared/email.ts` exporting `sendEmail({ to, subject, html, text?, from?, replyTo?, cc?, bcc? })`
- Default `from`: `Holarc Health <no-reply@holarchealth.com>` (MailerSend-verified domain required)
- Calls `POST https://api.mailersend.com/v1/email` with `Authorization: Bearer ${MAILERSEND_API_TOKEN}`
- Payload shape: `{ from: { email, name }, to: [{ email }], subject, html, text, reply_to, cc, bcc }`
- Parse `"Name <email>"` strings into MailerSend's `{ email, name }` objects
- Return shape: `{ ok, status, data?, error? }`

## 3. Delete the old shared module
- Delete `supabase/functions/_shared/mailgun.ts` (no compat alias — clean break)

## 4. Update every caller
Replace `import { sendMailgunEmail } from "../_shared/mailgun.ts"` with `import { sendEmail } from "../_shared/email.ts"` and rename the call:
- `send-document-email`
- `send-invoice-report`
- `submit-insurance-claim`
- `send-user-invitation`
- `send-patient-invitation`
- `notify-next-of-kin`
- `paypal-subscription`
- `auth-email-hook`
- any other grep hit on `mailgun`

Also scrub any comments/variable names mentioning Mailgun (e.g. `"Mailgun error:"` log strings → `"Email send failed:"`).

## 5. Config cleanup
- Confirm no `[functions.auth-email-mailgun]` block remains in `supabase/config.toml` (already removed earlier)
- Search project for any remaining "mailgun" string and remove

## 6. Auth emails
Unchanged — Supabase's built-in templates handle password reset / signup confirm. MailerSend powers only the app/transactional sends listed above.

## 7. Redeploy
Redeploy all functions touched in step 4.

## User action required
Verify `holarchealth.com` in the MailerSend dashboard (Domains → Add domain → publish the SPF + DKIM DNS records). Until verified, sends will be rejected.

## Out of scope
- UI changes
- Custom auth email templates
- Database changes
