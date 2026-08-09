# Documents: exact-template emails, PDF attachments, and retained history

## 1. Emails look exactly like the template

Today emailed documents are rebuilt as plain text inside a generic wrapper, so the letterhead, fonts and layout are lost (as in the invoice screenshot).

- Render the document with the same component used for on-screen preview (letterhead header, 12pt body, 10.5pt header/footer, chosen font, logo) and send that exact rendering as the email body.
- Applies to every send path: prescriptions, invoices, medical certificates, referral letters, templates and any document sent from a document editor or the Documents screen.

## 2. Attach the document as a PDF

- Every outgoing document email also carries a PDF attachment of the same rendered page (A4, letterhead included), named after the document and patient.
- The email body still shows the document so recipients can read it without opening the attachment.

## 3. Uploads and handwritten transcription

Already present in the Documents screen (drag-and-drop / Upload button, AI transcription of handwritten scans, record-date filing). This plan verifies both work end to end and fixes anything broken:
- Drag-and-drop and Upload accept PDFs, images, Word files and scans.
- Scans/photos are offered to AI transcription, producing an editable document linked back to the original file.

## 4. Inform button (links, never files)

Also already present. Verify and complete:
- Inform on any document lets you pick doctors on the app or type any email address.
- Recipients on the app get a link straight to the document; recipients not yet on the app get a link that takes them to registration and then to the same document.
- The document itself is never attached to Inform emails — only the link.

Note: item 2 (PDF attachment) applies to sending a document to a patient/pharmacy/insurer, not to Inform, which stays link-only by design.

## 5. Disconnecting a doctor keeps the history

- Disconnecting/deactivating a doctor already avoids deleting any data, but the previous doctor currently loses sight of the records entirely.
- Change so a previously connected doctor keeps read-only visibility of the records from the period they were connected (sessions, documents, prescriptions, notes), while losing ongoing/live access and the ability to add anything new.
- The patient keeps everything, and newly connected doctors continue to see the full history.

## Technical notes

- Extract a shared `renderDocumentHtml()` that produces the same markup/inline styles as `DocumentCanvas` (header/footer grids, font family, sizes, logo). Use it for the email body in `send-document-email` payloads instead of the plain-text wrapper.
- Generate the PDF client-side from the same rendered node (`html2canvas` + existing `jspdf` dependency), base64-encode it, and pass it as `attachments` on the send payload. Extend `_shared/email.ts` `SendEmailInput` with `attachments: { filename, content (base64) }[]` and forward to Resend; extend `send-document-email` to accept and pass them through. `SendDocumentButton` gains the rendered HTML + PDF producers so all editors get the behaviour at once.
- Retained history: add a `doctor_had_access(_doctor, _patient_user_id)` security-definer function matching any `doctor_patient_access` row regardless of `is_active`, and widen the SELECT-only policies on `documents`, `sessions`, `prescriptions` and related clinical tables to use it (INSERT/UPDATE/DELETE stay restricted to `is_active = true`). Records created after `revoked_at` stay hidden from the old doctor.
