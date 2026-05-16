## Findings

- Password reset requests reach the auth email hook successfully, but the email is still being delivered through the default Lovable Cloud sender path, not Mailgun.
- The custom Mailgun auth-email-hook function exists in the codebase and is configured to send from `HolarcHealth <noreply@holarchealth.com>`, but it shows no recent invocation logs — Supabase Auth is not routing to it.
- The previously configured sender subdomain `notify.nigeria.holarchealth.com` is **no longer in use** and should be ignored / removed. The intended sender domain going forward is `holarchealth.com` (the root domain already verified in Mailgun).

## Plan

1. **Remove the stale `notify.nigeria.holarchealth.com` configuration**
   - Disable Lovable Emails for the project so the managed sender stops competing with the Mailgun hook.
   - Surface the NS records that need to be removed from the domain registrar (delegation will not clear on its own).

2. **Activate the custom Mailgun hook**
   - Redeploy `auth-email-hook`.
   - Register it as the Supabase Auth Send Email hook, signed with `SEND_EMAIL_HOOK_SECRET`, so all auth emails (recovery, signup, magic link, invite, email-change, reauthentication) are sent via Mailgun from `noreply@holarchealth.com`.

3. **Validate**
   - Trigger a `/forgot-password` reset.
   - Confirm: auth log shows the hook URL pointing at the custom function, function logs show a Mailgun send, and the email arrives from `HolarcHealth <noreply@holarchealth.com>` — not Lovable Cloud.

## Technical notes

- Sender domain is `holarchealth.com` (root), already verified in Mailgun — no DNS work needed.
- Do NOT scaffold Lovable auth email templates; that would re-route through the managed Lovable email pipeline.
- The `nigeria.holarchealth.com` subdomain is abandoned and any references to it in email configuration should be cleared.