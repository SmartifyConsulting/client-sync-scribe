

# Plan: Fix auto-generated invoices showing R0.00 with no service line

## What actually happened in your Shannon session

The invoice **was** auto-created (`INV-202604-99958`, document + `invoices` row, both linked to the session). But:

- The AI summary returned `"Invoice detected: false"` because billing wasn't discussed in the dictation.
- The auto-invoice block runs unconditionally for every session, so it inserted the row with `amount = R0.00` and a placeholder `Consultation - <date>` services line.
- Result: a "blank" invoice that looks like nothing happened.

This has been silently happening on every session — `INV-202604-49814` (the earlier Shannon session today) is also R0.00.

## Fix: use the doctor's default service price as a fallback

Change `src/hooks/useSessions.ts` invoice block (lines ~733–890) so when the AI doesn't extract billing details:

1. **Look up a default service price** from `service_prices` for the doctor:
   - Prefer the one matching `is_first_consultation` based on whether this is the patient's first session with this doctor (count `sessions where patient_id=… and user_id=…` before insert).
   - Otherwise prefer one named like "General Consultation" / "Consultation".
   - Otherwise the first row.
2. If a default service is found and AI gave no line items, build the invoice with that single line:
   - Description: service name (e.g. "General Consultation with examination")
   - Amount: `default_price`
   - Currency: from the service row (e.g. `ZAR` → `R`)
3. If no service prices configured at all, **skip auto-invoice creation entirely** and toast: *"No default service price configured — set one in Settings to enable auto-invoicing."* (Don't litter the system with R0 invoices.)
4. Persist the proper amount on both the `documents.content` (rendered invoice) and the `invoices.amount` row.

## Currency symbol mapping

Tiny helper inline: `ZAR→R`, `USD→$`, `EUR→€`, `GBP→£`, `BWP→P`, `NAD→N$`, `SZL→E`, `LSL→M` (mirrors the table in `InvoiceEditor.tsx`).

## Cleanup of existing R0.00 ghost invoices

One-off: a self-heal in the doctor's Invoices page that flags any `amount = 0 AND status = 'pending' AND session_id IS NOT NULL` row with a small "Set amount" inline action so the doctor can quickly populate it (or delete it). No automatic deletion — these still belong to real sessions.

Optionally also: when the doctor opens `/admin` Invoices and there are pending R0 auto-invoices, show a one-time toast suggesting they configure default service prices.

## Files touched

| File | Change |
|---|---|
| `src/hooks/useSessions.ts` | Look up default `service_prices` row; fall back to it for line item + amount; skip insert if none configured. |
| `src/pages/doctor/Invoices.tsx` | Highlight `amount = 0` pending invoices with an inline "Set amount" affordance (re-uses the new Edit dialog from the previous plan). |

## Out of scope

- Asking the AI to *always* invent an invoice (risky — would invent prices).
- Backfilling amounts for the two existing R0 Shannon invoices automatically (the doctor can edit them via the new Edit action).
- Changing the AI prompt (it's correctly returning "no billing discussed").

