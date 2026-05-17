# Switch email pipeline to ZeptoMail (no Mailgun, no MailerSend, no Lovable Emails)

Since the Supabase Send Email Hook secret is hard to find/manage, we'll bypass auth hooks entirely and use **Supabase Auth's built-in custom SMTP** for auth emails. ZeptoMail offers SMTP credentials directly — no webhook secret needed.

Transactional emails (invoices, invitations, etc.) will switch from MailerSend to ZeptoMail's REST API.

## 1. Transactional sends — swap MailerSend for ZeptoMail in `_shared/email.ts`
- Replace MailerSend endpoint with ZeptoMail: `POST https://api.zeptomail.{REGION}/v1.1/email`
  - Region depends on the user's ZeptoMail account: `.com` (US/global) or `.eu` (EU). I'll ask.
- Auth header: `Authorization: Zoho-enczapikey ${ZEPTOMAIL_API_TOKEN}` (ZeptoMail uses `Zoho-enczapikey` prefix, not `Bearer`)
- Payload shape:
  ```json
  {
    "from": { "address": "no-reply@holarchealth.com", "name": "Holarc Health" },
    "to":   [{ "email_address": { "address": "...", "name": "..." } }],
    "subject": "...",
    "htmlbody": "...",
    "textbody": "...",
    "reply_to": [{ "address": "..." }],
    "cc": [...],
    "bcc": [...]
  }
  ```
- Keep the public `sendEmail({ to, subject, html, text, from, replyTo, cc, bcc })` signature so **no caller files change**.

## 2. New secret
- Add `ZEPTOMAIL_API_TOKEN` (from ZeptoMail → Mail Agents → your agent → Setup Info → Send Mail API Token, including the `Zoho-enczapikey ` prefix or just the token portion — I'll handle both).

## 3. Remove unused secrets
- Delete `MAILERSEND_API_TOKEN` after the swap is confirmed working.

## 4. Auth emails — use Supabase custom SMTP (no hook)
This is the part that removes the "hook secret" pain. In **Cloud → Auth → SMTP Settings** you (manually, one time) enter:
- **Host**: `smtp.zeptomail.com` (or `smtp.zeptomail.eu` for EU)
- **Port**: `587`
- **Username**: `emailapikey`
- **Password**: your ZeptoMail SMTP token (different from the API token — generated under Mail Agents → SMTP Info)
- **Sender email**: `no-reply@holarchealth.com`
- **Sender name**: `Holarc Health`

Once saved, all Supabase Auth emails (password reset, signup confirm, magic link, invites, email change, 2FA) go straight through ZeptoMail SMTP. No webhook, no hook secret, no edge function.

I'll also delete or skip-deploy the now-unused `auth-email-hook` function in step 5 to avoid confusion.

## 5. Cleanup
- Delete `supabase/functions/auth-email-hook/` (no longer used — SMTP path replaces it)
- Remove `[functions.auth-email-hook]` block from `supabase/config.toml`
- Scrub any lingering "mailgun", "mailersend", or "resend" strings from the codebase
- Update `.lovable/plan.md` to reflect ZeptoMail as the chosen provider

## 6. Redeploy
- Redeploy all 8 transactional functions that import `_shared/email.ts`

## 7. Verify ZeptoMail domain
You must verify `holarchealth.com` in **ZeptoMail → Domains** (publish their SPF + DKIM DNS records). Until verified, ZeptoMail rejects every send.

## Questions before I implement
1. Which ZeptoMail region — `.com` (US/global) or `.eu` (EU)?
2. Do you want auth emails via SMTP (recommended, no hook secret) or do you still want me to keep `auth-email-hook` available as a fallback?
3. Is `no-reply@holarchealth.com` still the desired From address, or do you want something else (e.g. `noreply@holarchealth.com`)?

After you answer + add `ZEPTOMAIL_API_TOKEN`, I'll do steps 1, 3, 5, 6 in one pass.
