

# Plan: PAID stamp on paid invoices + auto-email to medical aid claims address

## Status of what's already in place

- `patients.claims_email` — **already exists** as a column. Already captured/edited in `PatientDetailsEditor.tsx` (under the Medical Aid section).
- Doctor's "Mark Paid" handler in `src/pages/doctor/Invoices.tsx` already auto-forwards to `claims_email` IF the patient has toggled on `auto_email_invoice_to_insurance` in their settings.
- The `submit-insurance-claim` edge function exists for manual patient-initiated claims.

So the field exists and the trigger fires — but **the email is a flat text dump** (`Invoice Number: …\nAmount: …`), not a real PAID-stamped invoice document. That's the gap.

## What this plan does

1. Show the **Claims Email** field more prominently and label it as "Medical Aid Claims Email" with helper text explaining the auto-submit behavior. (Already in the editor; just relabel + add a small "Auto-submit on payment" hint and surface it in the read-only view too.)
2. **Build a PAID-stamped invoice document** when the doctor marks an invoice paid — render the actual invoice template (header, footer, line items, totals, currency) and overlay a large red diagonal `PAID` watermark with the paid date.
3. **Persist that PAID version** as a new `documents` row (`template_name='Invoice (Paid)'`, `is_draft=false`, `name="Invoice <number> — PAID"`) so it shows up in the patient's documents and the doctor's documents tab as the canonical paid version.
4. **Auto-email to the medical aid claims address** using the rendered HTML invoice (not a text dump). Falls back gracefully when no claims email is set or the patient hasn't enabled the toggle.
5. Allow the doctor to **manually trigger "Send to Medical Aid"** from the doctor Invoices page even when the patient hasn't enabled auto-submit (some practices want to send regardless).

## How the PAID stamp works

We have two render paths to reuse:
- The Invoice template content lives on `documents.content` (auto-created by `useSessions.ts`) or can be re-built from the `invoices` row.

Approach: build the rendered HTML on the client at the moment of "Mark Paid":
- Read the matching auto-generated invoice document (joined by `session_id` + `template_name='Invoice'`) if it exists; otherwise build the invoice content from the `invoices` row + patient + profile (mirror the `useSessions.ts` invoice replacement map: invoice number, date, services lines, total in correct currency, practice address, doctor number, bank details, patient address, medical aid + number).
- Wrap it in the standard letterhead HTML (the `useTemplateWithHeaderFooter` pattern already used in `DocumentPreview`).
- Overlay a CSS-rotated absolutely-positioned div: `PAID` in bold red (#E01837), 120px, ~25° rotation, 0.35 opacity, plus a small "Paid on <date>" subtitle below it.
- Save the resulting HTML to a new `documents` row.

For the email body we send the same HTML (Resend handles HTML email natively — `send-document-email` already wraps `documentContent` in HTML; we'll bypass its `<br/>` text formatter when the caller passes `documentHtml` directly).

## Edge function changes

`supabase/functions/send-document-email/index.ts`
- Accept an optional `documentHtml` field. When present, use it verbatim as the email body (skip the text-to-HTML conversion). Keep the existing `documentContent` path for backwards compatibility.
- Accept an optional `replyTo` (set to the doctor's email) so claim responses come back to the doctor.

No new edge function needed.

## Doctor-side flow (`src/pages/doctor/Invoices.tsx`)

Replace the current `markAsPaid` body after the DB update:

1. Update the `invoices` row → `status='paid'`, `paid_at=now()`. (existing)
2. Build the PAID-stamped invoice HTML via a new helper `buildPaidInvoiceHtml(invoice, patient, profile, headerFooter)`.
3. Insert a `documents` row with that HTML (`template_name='Invoice (Paid)'`, `is_draft=false`, `name="Invoice <number> — PAID"`, `patient_id`, `user_id=doctor`, `session_id`).
4. If `patient.claims_email` is set:
   - If `auto_email_invoice_to_insurance` is on → fire `send-document-email` with `documentHtml` automatically and toast "Sent to <claims_email>".
   - If off → don't auto-send, but show a "Send to Medical Aid" button next to the now-paid invoice that does the same call on click.
5. If no `claims_email`, show toast: "No claims email on file — add it on the patient profile to enable auto-submit."

Add a manual **"Resend to Medical Aid"** action in the row dropdown for paid invoices (wraps the same call). Useful for re-submission.

## UI tweaks

`src/components/patients/PatientDetailsEditor.tsx`
- Relabel the existing `claims_email` field to **"Medical Aid Claims Email"** with helper text: "When invoices are marked paid, the PAID invoice is auto-submitted here (if enabled in patient settings)."
- In the read-only view (line 1832), keep the same label.

`src/pages/doctor/Invoices.tsx`
- For paid rows, add a small "Send to Medical Aid" button (mail icon) that's disabled with a tooltip when `claims_email` is missing, mirroring the patient-side `submit-insurance-claim` UX.
- Toast wording when auto-send fires: "Paid invoice emailed to <claims_email>".

`src/components/settings/SettingsContent.tsx`
- Existing patient toggle copy already correct ("Auto-email invoice to medical aid"). No change.

## Files touched

| File | Change |
|---|---|
| `src/pages/doctor/Invoices.tsx` | Replace text-dump email with PAID-stamped HTML invoice; insert `documents` row; add manual "Send to Medical Aid" button on paid rows. |
| `src/lib/paidInvoice.ts` *(new)* | `buildPaidInvoiceHtml(...)` — renders invoice template with letterhead + PAID watermark overlay. |
| `src/components/patients/PatientDetailsEditor.tsx` | Relabel claims email field + add helper text. |
| `supabase/functions/send-document-email/index.ts` | Accept `documentHtml` (use as-is) and `replyTo`. |

## Out of scope

- Generating a PDF attachment instead of inline HTML (HTML email renders fine in claims inboxes; PDF is a heavier change requiring a render service).
- Reverting the PAID document if a doctor un-marks an invoice as paid (unmark isn't currently exposed; can add later).
- Sending claim status callbacks from the medical aid back into the app.
- Touching the patient-initiated `submit-insurance-claim` flow (already works for manual patient claims).

