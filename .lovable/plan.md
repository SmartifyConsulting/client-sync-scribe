## Diagnose & fix password-reset email delivery

### Findings so far
- Recovery link was generated successfully (auth log confirms).
- Edge function returned 200, meaning Resend accepted the email.
- Domain `holarchealth.com` is verified in Resend.
- Email never arrived (inbox or spam) for `info@georgiaadams.co.za`.

Conclusion: Resend accepted the email but it was either bounced/blocked by the recipient mail server, or silently dropped due to missing DMARC/SPF. Current code doesn't log the Resend message ID, so we can't trace it.

### Steps

**1. Add success logging**
- `supabase/functions/_shared/email.ts` — log Resend response (message `id`, status) on success, plus `from` and `to` addresses.
- `supabase/functions/send-password-reset/index.ts` — log the Resend message ID and recipient after send.
- Redeploy `send-password-reset`.

**2. Re-trigger the reset** for `info@georgiaadams.co.za` and read the edge function logs to capture the Resend message ID.

**3. Inspect delivery status in Resend dashboard**
With that message ID, check Resend → Emails for one of: `delivered`, `bounced`, `complained`, `blocked`, or stuck in queue. This tells us exactly where it failed.

**4. Apply the right fix based on what we find**
- **Bounced/blocked at recipient** → the `co.za` mail server is filtering. Almost always fixed by adding/strengthening **DMARC + SPF** on `holarchealth.com`:
  - SPF (TXT on `holarchealth.com`): `v=spf1 include:_spf.resend.com ~all`
  - DMARC (TXT on `_dmarc.holarchealth.com`): `v=DMARC1; p=none; rua=mailto:postmaster@holarchealth.com`
  - Confirm DKIM is published (Resend dashboard shows the records).
- **Delivered** → email is being filtered at the mailbox level; try sending to a Gmail test address to confirm sender reputation is fine, then ask the recipient to whitelist `no-reply@holarchealth.com`.
- **Suppressed** → recipient is on Resend's suppression list (prior bounce). Remove from suppression in Resend dashboard.

### Files changed
- `supabase/functions/_shared/email.ts`
- `supabase/functions/send-password-reset/index.ts`

### What I'll report back after step 2
- The Resend message ID from the new logs.
- The exact status from your Resend dashboard for that message.
- The specific DNS or suppression fix required (no guessing).
