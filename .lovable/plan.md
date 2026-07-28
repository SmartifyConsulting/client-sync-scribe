## Goal

Move document intake off `holarc.com` (which still has Zoho MX records — Zoho came from that domain's existing mail hosting, not from anything in this app) and onto the new subdomain `docs.holarchealth.com`, using Resend Inbound.

## Current DNS state (checked just now)

- `holarc.com` → MX at Zoho, SPF `include:zoho.com`. Untouched by this plan.
- `holarchealth.com` → no MX, no TXT visible.
- `docs.holarchealth.com` → no MX, no TXT visible yet.

So the records you added either haven't propagated, or were added as web/A records for the cPanel subdomain rather than the MX record Resend needs. Note: the cPanel path `/home/ouxnfdxz/public_html/docs` is a *web* docroot — it plays no part in mail delivery. Only the MX record on `docs.holarchealth.com` matters.

## Steps

### 1. Resend receiving domain (your action, guided)
- In Resend: Emails → Receiving → add `docs.holarchealth.com`.
- Add the single MX record it shows, on the host `docs` at your DNS provider for holarchealth.com.
- Register a webhook for event `email.received` pointing at:
  `https://<backend>/functions/v1/receive-email-document`
- Save the webhook signing secret (`whsec_...`). If the value currently stored isn't that one, it gets re-saved.

Zoho on `holarc.com` is completely unaffected — different domain, different MX.

### 2. Code changes
- `src/components/documents/MailboxIntakeAddress.tsx` — build the address from a single shared constant instead of the hardcoded `@holarc.com`.
- New `src/lib/mailboxDomain.ts` exporting `INTAKE_EMAIL_DOMAIN = "docs.holarchealth.com"`, so the address shows as `samuel-0koli@docs.holarchealth.com`.
- `supabase/functions/receive-email-document/index.ts` — the recipient matcher already ignores the domain part and matches only the local alias, so it keeps working for both old and new domains. Only a small change: accept the new domain in logs and stop assuming `holarc.com`. Redeploy after the edit.

### 3. Verify
- Send a real email with a PDF attachment to `samuel-0koli@docs.holarchealth.com` (digit zero in `0koli`).
- Confirm the webhook delivery is green in Resend, a row appears in `documents`, and the attachment downloads from My Documents.

## Technical notes

- Nothing else changes: the `attachments` column, the private `email-attachments` bucket and its policies, the alias lookup, and signed download URLs are all reused.
- If you'd rather use `holarchealth.com` at the root instead of the `docs.` subdomain, say so before step 1 — but that would then take over *all* mail for holarchealth.com, so the subdomain is the safer choice.
