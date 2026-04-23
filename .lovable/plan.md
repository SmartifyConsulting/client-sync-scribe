

# Plan: Fix cert dates, prescription preview, Admin invoice layout, smaller PAID stamp

Four targeted fixes — root causes confirmed in DB and source.

## 1. Medical Certificate: Start Date defaults to today (not session date)

**File:** `src/components/sessions/MedicalCertificateEditor.tsx`

In the auto-detect `useEffect` (lines ~67–154), the session-date inference currently overwrites the user's expected default of today. Change behaviour:

- **Start Date stays at today** (initial `useState` value), regardless of session date.
- **Examination Date** also defaults to today (matches when the certificate is being issued).
- **End Date** defaults to today and only changes if the AI infers a return-to-work / leave-duration value from the summary (priority 1, 3, 4 logic kept; the from/to override of `setStartDate` in priority 2 is removed so the start date is never silently shifted backwards).
- The `setStartDate(iso)` and `setExaminationDate(iso)` calls based on `data.started_at` are removed.

Net effect: opening a Medical Certificate from any session always shows today's date, and the doctor can adjust if needed.

## 2. Prescription preview: render real medication data (not all `___`)

**Root cause** (confirmed in DB): the doctor's saved Prescription template uses indexed slot tokens — `[Medication1]`, `[Dosage1]`, `[Quantity1]`, `[Instructions1]` (1–3), plus `[PrescriptionDate]`, `[NumberOfRepeats]`, `[SpecialInstructions]`. None of these are in the replacement map in `useSessions.ts` (lines 442–467). Line 468 then strips every remaining `[Token]` to `___`, blanking the entire Rx body. The medications list IS appended after, but the visible "1. ___ / Dosage: ___ / Quantity: ___ / Instructions: ___" rows above it look broken.

**Fix in `src/hooks/useSessions.ts`** (prescription block, lines ~420–520):

- Build replacements for indexed medication slots dynamically from the AI-extracted `medications[]`:
  - For `i = 1..max(3, medications.length)`: map `Medication{i}`, `Dosage{i}`, `Quantity{i}`, `Frequency{i}`, `Instructions{i}` to the corresponding fields (or empty string if that slot is unused).
- Add the missing global tokens: `PrescriptionDate` → today, `NumberOfRepeats` → `rx.repeats ?? ''`, `SpecialInstructions` → `rx.special_instructions || rx.notes || ''`.
- Skip the trailing "append `medsHtml` block" (line 470–473) when the template path is used — the template already contains the slots, so duplicating creates the messy `<p>` block beneath the structured Rx.
- For the unmatched-token cleanup (line 468), replace empty slot tokens with empty string (not `___`) so unused Rx rows render as a blank line, not as visual noise. Only **non-slot, non-empty** unknown tokens fall back to `___`.

**Also extend `src/lib/fillDocumentPlaceholders.ts`** so the runtime auto-heal path on legacy docs handles the same indexed slots (read them off an optional `prescription` field added to `FillContext`). Used by the TodoList preview path which doesn't currently know about prescription slots.

## 3. Admin invoice preview: render with line breaks (not one flat paragraph)

**Root cause** (confirmed in DB): the auto-generated `documents.content` for invoices is **plain-text** with `\n` line breaks. `buildInvoiceHtml` → `fetchExistingInvoiceContent` returns that text and drops it directly into an iframe `srcDoc`, where HTML collapses all whitespace into single spaces. Result: one long line as in the screenshot.

**Fix in `src/lib/invoiceHtml.ts`:**

- In `fetchExistingInvoiceContent`, after running the placeholder fill, detect plain-text vs HTML content. If the resolved string contains no block-level HTML (no `<p>`, `<div>`, `<br>`, `<table>`, `<h1..6>`), wrap it in:
  ```html
  <div style="white-space: pre-wrap; font-family: Arial, sans-serif; padding: 24px; line-height: 1.5; color: #222;">…</div>
  ```
  This preserves `\n` breaks visually without needing to rewrite the template.
- For HTML content, return as-is (current behaviour).

This fix automatically applies to **every** existing R0/legacy invoice preview, the Admin tab preview, and the email path.

## 4. PAID stamp: ~10 cm, not full-page

**File:** `src/lib/invoiceHtml.ts` (lines ~154–185)

Reduce the stamp dimensions to roughly 10 cm wide:

- `font-size: 140px` → `font-size: 56px`
- `letter-spacing: 8px` → `letter-spacing: 4px`
- `border: 10px solid` → `border: 4px solid`
- `padding: 10px 40px` → `padding: 6px 24px`
- `width: ~10cm` enforced via `max-width: 380px` on the inner stamp box.
- Sub-line ("Paid on …") `font-size` stays at 14px; reduce `margin-top` to `4px`.

Stamp keeps the diagonal `-25deg` rotation and centred position but is now ~10 cm across — visible but no longer dominating the page.

## Files touched

| File | Change |
|---|---|
| `src/components/sessions/MedicalCertificateEditor.tsx` | Stop overwriting Start/Examination dates from session; today is the default. |
| `src/hooks/useSessions.ts` | Map indexed `[Medication{n}]`/`[Dosage{n}]`/`[Quantity{n}]`/`[Frequency{n}]`/`[Instructions{n}]` slots, plus `[PrescriptionDate]`, `[NumberOfRepeats]`, `[SpecialInstructions]`. Skip duplicate medsHtml append when template path runs. Empty unused slots render blank, not `___`. |
| `src/lib/fillDocumentPlaceholders.ts` | Extend `FillContext` with optional `prescription` carrying medications; resolve indexed slots; empty-slot cleanup matches behaviour above. |
| `src/lib/invoiceHtml.ts` | Wrap plain-text invoice content in `white-space: pre-wrap` div so line breaks render. Shrink PAID stamp to ~10 cm. |

## Out of scope

- Redesigning the doctor's Invoice / Prescription templates (we adapt to whatever shape they're in).
- Backfilling old documents in SQL — the layout fix renders correctly on first preview without touching stored content.
- Changing AI extraction prompts.
- Adding a service-list dropdown inside `InvoiceEditor` — the previously-approved Edit action already lets the doctor pick from `service_prices` via the existing line-item editor; no new UI needed for that thread.

