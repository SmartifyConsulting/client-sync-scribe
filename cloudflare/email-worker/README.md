# Inbound email worker (holarc.com)

Routes mail sent to `{alias}@holarc.com` into the app as a document, with
attachments stored as real files.

## One-time setup

1. **Cloudflare → your zone `holarc.com` → Email → Email Routing → Get started.**
   Add the MX and TXT records Cloudflare shows you at your DNS provider.
2. **Deploy the worker**

   ```bash
   cd cloudflare/email-worker
   npm install
   npx wrangler secret put INTAKE_URL     # the intake endpoint URL
   npx wrangler secret put INTAKE_SECRET  # same value as the app's EMAIL_INTAKE_SECRET
   npx wrangler deploy
   ```

3. **Email Routing → Routing rules → Catch-all address → Action: Send to a Worker
   → `holarc-email-intake` → Save.**

## How it works

- The worker parses the raw MIME message with `postal-mime`.
- It POSTs `{ from, to, subject, text, html, attachments[] }` to the intake
  endpoint with an `x-intake-secret` header.
- The endpoint matches the recipient's local part against `profiles.mailbox_alias`
  (case-insensitive, `+tags` stripped), creates a document for that user, and
  uploads attachments to the private `email-attachments` bucket under
  `{user_id}/{document_id}/{filename}`.
- Unknown addresses are rejected so the sender receives a bounce instead of the
  mail disappearing silently.

## Limits

- 10 MB per attachment, 25 MB total per email. Skipped files are listed in the
  document body.
