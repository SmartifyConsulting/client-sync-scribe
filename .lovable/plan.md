## What I found

Two separate problems — the second is the real blocker.

1. **The address was misspelled.** Samuel's mailbox alias in the database is `samuel-0koli`, so his intake address is `samuel-0koli@holarc.com`. The mail was sent to `samule-0koli@holarc.com`, which matches no profile.

2. **Nothing is routing mail into the app at all.** The app has an intake endpoint that turns an incoming email into a document, but no mail service is currently delivering to it — there is no email domain configured for the project, and the documents table contains zero email-created documents, ever. So even with the correct spelling the message would never have arrived.

Note: the app's outbound/auth email system does not receive mail. Inbound has to be handled by a mail provider — per your choice, Cloudflare Email Routing.

## Plan

### 1. Inbound pipeline (Cloudflare Email Routing)

- Harden the existing intake endpoint (`receive-email-document`) so it can be safely called from the internet:
  - require a shared secret header; reject anything else with 401
  - validate the payload shape before processing
  - normalise the recipient (lowercase, strip `+tags`) and match the alias case-insensitively
  - if the alias is unknown, log it and return a clear "unknown mailbox" response instead of a silent failure
- Add a Cloudflare Email Worker script to the repo (under `cloudflare/email-worker/`) that parses the raw MIME message, extracts sender, subject, body text/HTML and attachments, and POSTs them to the intake endpoint with the shared secret.
- You then do the one-time Cloudflare setup: enable Email Routing on `holarc.com`, add the MX/TXT records it gives you, deploy the worker, and set a catch-all rule to send all mail to the worker. I'll give you the exact endpoint URL and steps; I can't touch your DNS.

### 2. Attachments stored as real files

- Create a private `email-attachments` storage bucket with access rules so a user can only read files under their own folder.
- The worker forwards attachments as base64; the intake endpoint decodes each one, uploads to `email-attachments/{user_id}/{document_id}/{filename}`, and records name, size and path.
- Store the attachment list on the document record so My Documents can render download links (signed URLs, since the bucket is private).
- Guard rails: skip files over 10 MB, cap total per email, sanitise filenames, and note any skipped file in the document body.

### 3. Surfacing it in the UI

- Show attachment chips with download links on email-sourced documents in My Documents.
- Show the user's own intake address on their profile/documents page with a copy button, so the exact alias can't be mistyped again.

### 4. Verify

- Send a test email with an attachment to `samuel-0koli@holarc.com` after Cloudflare is live, then confirm the document and the stored file appear in his My Documents.

## Technical notes

- Intake function: `supabase/functions/receive-email-document/index.ts` — keeps the existing `{alias}@holarc.com` and legacy `docs-{mailbox_id}@` matching, gains secret auth, attachment upload and better logging.
- New shared secret stored as a backend secret and set as a Worker variable on the Cloudflare side (same value both places).
- Migration adds an `attachments jsonb` column to `documents` (default `[]`), plus the storage bucket and its policies.
- Worker uses `postal-mime` for MIME parsing; deployed with `wrangler` from your Cloudflare account.
