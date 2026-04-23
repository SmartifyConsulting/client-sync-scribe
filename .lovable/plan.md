

# Plan: Fix preview placeholders + tighten Admin tab typography + full Invoice CRUD

Three coordinated changes. (1) is the previously-approved preview fix; (2) and (3) are new.

## 1. Document previews always show real values (legacy + new)

### Root cause
Legacy `documents` rows for Invoices, Prescriptions, Certificates, etc. were saved with raw `[InvoiceNumber]`, `[PatientAddress]`, `[MedicalAid]`, `[BankDetails]`, `[Services]`, `[TotalAmount]`, `[DoctorNumber]` tokens. Previews render `doc.content` verbatim, so the brackets show.

### Fix
- **New** `src/lib/fillDocumentPlaceholders.ts` — single source-of-truth helper. Replaces all known patient / practice / invoice / time tokens (case-insensitive, supports `[Token]` and `[Token Name]`). Unknown tokens become a thin grey `___` so brackets never leak through.
- **Render-time fill + auto-heal** in `src/pages/TodoList.tsx` (`handlePreviewDoc`) and `src/pages/Documents.tsx`: on open, fetch the doc's patient + doctor profile (+ matching `invoices` row when `template_name='Invoice'`), run the helper, pass resolved content to `<DocumentPreview>`. If the resolved content differs from what's stored, `update documents set content = resolved` so subsequent views, prints, and emails are clean.
- **Refactor** `src/hooks/useSessions.ts` invoice/prescription/cert/referral/admission blocks to use the same helper — eliminates drift. Also fixes the bank-details lookup to read `profile.bank_account_details` (current code reads a non-existent `bank_details` column).
- **Belt-and-braces** in `src/components/sessions/DocumentPreview.tsx`: `handlePrint` and `handleSendEmail` run the helper too (no-op if already resolved).

No data migration — auto-heal handles legacy docs lazily on first open.

## 2. Admin tabs: enforce 11–12px scale across every screen

`src/pages/Admin.tsx` hosts four sub-screens via `<Tabs>`: **Calendar**, **To-Do**, **Invoices**, **Templates** (which renders `CalendarView`, `TodoList`, `doctor/Invoices`, `Documents`). They each have their own typography that's larger than the rest of the admin shell.

Apply the project mobile-compaction standard (`text-[11px]` body / `text-[12px]` headings) to anything rendered inside the Admin tabs:

- Wrap each `<TabsContent>` in a scoped class like `class="admin-tab-scope"` and add a section in `src/index.css`:
  ```css
  .admin-tab-scope, .admin-tab-scope * {
    font-size: 11px;
  }
  .admin-tab-scope h1, .admin-tab-scope h2, .admin-tab-scope h3 { font-size: 12px; }
  .admin-tab-scope .text-xs, .admin-tab-scope .text-sm,
  .admin-tab-scope .text-base, .admin-tab-scope .text-lg,
  .admin-tab-scope .text-xl, .admin-tab-scope .text-2xl,
  .admin-tab-scope .text-3xl { font-size: 11px; }
  .admin-tab-scope th, .admin-tab-scope td { font-size: 11px; padding: 6px 8px; }
  .admin-tab-scope button { font-size: 11px; }
  .admin-tab-scope input, .admin-tab-scope textarea, .admin-tab-scope select { font-size: 12px; }
  ```
  Inputs stay at 12px to avoid mobile zoom-on-focus. Icons untouched.
- Do NOT modify the underlying pages (`CalendarView`, `TodoList`, `doctor/Invoices`, `Documents`) — those still need their own scales when used standalone. The scope class only applies inside Admin.
- Tighten the Admin shell heading itself: `h1` from `text-xl` → `text-[12px] font-semibold`, and tabs row already uses `text-xs` (leave).

## 3. All Invoice records: preview + edit (no exceptions)

Today in `src/pages/doctor/Invoices.tsx`:
- Only **paid** invoices have a "Send to Medical Aid" / view path; pending/overdue invoices show a Mark-Paid button and a download but no preview/edit affordance.
- The doc-preview path only exists for the auto-generated Invoice document and the new "Invoice (Paid)".

Add a uniform actions cluster on **every** invoice row regardless of status:

| Action | Behavior |
|---|---|
| **Preview** (eye icon) | Opens `<DocumentPreview>` with the rendered HTML. Re-uses the same render path as TodoList/Documents (auto-heal placeholders, letterhead applied). If no `documents` row exists for the invoice yet (legacy/manual), build it on the fly via `buildPaidInvoiceHtml`-style helper renamed to `buildInvoiceHtml(invoice, patient, profile, headerFooter, { paid: boolean })` so the same renderer works for unpaid invoices (no PAID stamp) and paid (with stamp). |
| **Edit** (pencil icon) | Opens the existing `InvoiceEditor` dialog, pre-loaded from the `invoices` row (line items, patient, currency, dates). Save updates the `invoices` row AND regenerates the linked `documents` row's `content`. Works for any status. |
| **Mark Paid** | Existing button, only when `status !== 'paid'`. |
| **Send to Medical Aid** | Existing button, only when `status === 'paid'` and `claims_email` present. |
| **Download** | Existing. |

Implementation notes:
- Extract the invoice render into `src/lib/invoiceHtml.ts` (factor out from `paidInvoice.ts`); `paidInvoice.ts` becomes a thin wrapper that calls it with `{ paid: true }`.
- `InvoiceEditor` already supports the multi-line-item flow used elsewhere — wire its `defaultValue` from the row when opened in edit mode and call `update invoices set ... where id=` on save, then upsert the matching `documents.content`.
- Keep the existing read-only column layout; actions live in the trailing actions cell with consistent icon-button styling.

## Files touched

| File | Change |
|---|---|
| `src/lib/fillDocumentPlaceholders.ts` *(new)* | Shared placeholder filler. |
| `src/lib/invoiceHtml.ts` *(new)* | `buildInvoiceHtml(...)` shared between preview, paid stamping, email. |
| `src/lib/paidInvoice.ts` | Refactor to delegate to `invoiceHtml.ts`. |
| `src/hooks/useSessions.ts` | Use shared helper for all template fills; fix bank-details column. |
| `src/pages/TodoList.tsx` | Render-time fill + auto-heal in preview. |
| `src/pages/Documents.tsx` | Same render-time fill + auto-heal. |
| `src/components/sessions/DocumentPreview.tsx` | Safety pass through helper for print/email. |
| `src/pages/Admin.tsx` | Add `admin-tab-scope` wrapper to each `<TabsContent>`; shrink the page `<h1>`. |
| `src/index.css` | Add `.admin-tab-scope` typography rules (11–12px). |
| `src/pages/doctor/Invoices.tsx` | Preview + Edit actions on every invoice row regardless of status; wire to `InvoiceEditor` and `<DocumentPreview>`; persist edits back to `invoices` and the linked `documents` row. |

## Out of scope

- Changing typography of standalone (non-Admin) `CalendarView` / `TodoList` / `Documents` / `doctor/Invoices` pages.
- PDF export of invoices (still HTML email + browser print).
- Reverting an invoice from paid → pending (not exposed today).
- SQL backfill of legacy docs (lazy auto-heal is enough).
- Editing invoices that originated from a session in a way that diverges from the session — edits stay tied to the same `session_id`.

