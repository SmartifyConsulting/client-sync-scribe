## Goal

Replace the planned Cloudflare Email Worker with **Resend Inbound** so that mail sent to `<alias>@holarc.com` lands in the recipient's "My Documents". Everything already built (the `attachments` column, the private `email-attachments` bucket and its policies, the alias lookup, the `MailboxIntakeAddress` component) is reused unchanged.

## Yes — Resend can do this

Resend supports receiving email: you point MX for a domain at Resend, and Resend POSTs an `email.received` webhook to an endpoint you choose. Two important details from their docs that shape the design:

- The webhook payload contains **metadata only** (from / to / subject / attachment names + ids). The body and the attachment bytes must be fetched afterwards from Resend's Received-email and Attachments APIs using the `email_id`.
- Webhooks are signed (Svix-style `svix-id` / `svix-timestamp` / `svix-signature` headers) with a webhook secret, so the endpoint can be public but still verified.

### One caution about the root-domain choice

You chose `name@holarc.com` (root). Resend will then receive **all** mail for `holarc.com` — every address, not just the intake aliases. If any human mailbox currently lives on `holarc.com` (Google Workspace, Microsoft 365, cPanel), adding Resend's MX record will break it. Step 1 below checks this first; if existing MX records are found, I'll flag it and recommend `docs.holarc.com` before any DNS change is made.

## Steps

### 1. Domain and DNS (your action, guided)
- Check the current MX records for `holarc.com` and report what's there.
- In Resend: Emails → Receiving → add `holarc.com` as a receiving domain, then add the single MX record it gives you at your DNS provider.
- Register a webhook for event `email.received` pointing at the intake endpoint URL (given in step 3), and copy the webhook signing secret.

### 2. Secrets
- `RESEND_WEBHOOK_SECRET` — the signing secret from Resend's webhook page (requested via the secure form).
- Resend API access reuses the existing Resend connection already linked to this project; no new key needed.

### 3. Rework the intake function
`supabase/functions/receive-email-document/index.ts` currently expects a Cloudflare worker to POST a full parsed email with a shared secret. It gets restructured to:
- Verify the Svix signature against `RESEND_WEBHOOK_SECRET`; reject unsigned/invalid requests with 401. Keep the old `x-intake-secret` path only as a manual-test fallback.
- Ignore any event whose `type` is not `email.received`.
- Resolve the recipient: for each address in `to` / `received_for`, normalise it (strip display name and `+tag`), take the local part, and match it against `profiles.mailbox_alias`. Unknown alias → 200 with `{ ignored: true }` so Resend doesn't retry forever.
- Fetch the body via Resend's received-email API using `email_id`, and each attachment via the attachments API.
- Enforce the existing limits (10 MB per file, 25 MB per email), sanitise filenames, upload to `email-attachments/<user_id>/<email_id>/<filename>`, and insert one `documents` row (title from subject, content from the text/HTML body, `attachments` jsonb holding filename / path / size / content type).
- `verify_jwt` stays false for this function so Resend can call it.

### 4. Drop the Cloudflare piece
No `cloudflare/` worker directory is created; that part of the previous plan is removed.

### 5. UI (small)
- `MailboxIntakeAddress` keeps showing `<alias>@holarc.com` (unchanged for the root-domain choice), surfaced on My Documents.
- Document rows with attachments get download links via short-lived signed URLs from the private bucket.

### 6. Verify
- Send a real email with a PDF to `samuel-0koli@holarc.com` (note the digit zero in `0koli` — the earlier test used the misspelled `samule-0koli`, which is why nothing arrived).
- Confirm the webhook delivery is green in Resend, the row appears in `documents`, and the attachment downloads from My Documents.

## Technical notes

- Attachment bytes never pass through the webhook body, so serverless payload limits are not a concern.
- Resend stores received emails even if the endpoint is down and retries the webhook, so a deploy during testing won't lose mail; events can also be replayed from their dashboard.
- Inserts use the service role inside the edge function; existing owner-scoped RLS on `documents` and on the `email-attachments` bucket governs all reads.
