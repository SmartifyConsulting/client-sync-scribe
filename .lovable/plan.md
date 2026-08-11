# Session view clean-up: duplicate invoices, typography, AI Clinician Notes

## 1. Stop duplicate invoices

Confirmed in the data: every finished session produces **two** invoice documents seconds apart.

- One from the auto-generation flow: draft, linked to the session, named
  `Invoice INV-202608-16067 - Paraskavoula Soldatos - 2026-08-11`, built from the doctor's Invoice template.
- One from the session screen's own invoice step: not a draft, **no session link**, named
  `Invoice INV-73470182`, with plain non-template content.

Fix: the session screen stops creating its own invoice document. It first looks for the
invoice document already created for that session and reuses it; only if none exists does it
create one, using the same naming convention and template rendering, and always linked to the
session. The `invoices` record itself is still created once, as today.

Clean-up: remove the orphan plain-content invoice documents (no `session_id`, `INV-` + 8 digits
naming) that were created alongside a template invoice for the same patient and day.

## 2. Sessions tab typography

In the patient profile Sessions table the summary column renders at `text-lg`. Bring it to the
same 12px muted body style used in Personal Information, and align the date/time cells with the
standard label/value sizes.

## 3. Notes become AI Clinician Notes

The free-text "Notes" block on a past session holds the Working Impression / Safety Checks /
Differentials content. Merge it into the AI Clinician Notes panel: if the session has no stored
AI clinician output but does have these notes, render them through the same section parser and
pastel accordions. Remove the separate "Notes" card.

Retention: AI Clinician Notes are shown for 7 days after the session date. After that the panel
shows a short "Clinician notes are retained for 7 days" line instead of the content. AI Summary
and action points stay permanent.

## 4. Move the retention warning

The "Voice recordings and transcriptions are automatically deleted after 7 days" line moves out
of the page footer into the AI Summary card, sitting inline beside the Download control.

## Technical notes

- `src/pages/Sessions.tsx` — `createInvoiceDocument` reuses/looks up the session invoice document.
- `src/features/patients/components/SessionHistoryTable.tsx` — typography.
- `src/features/sessions/components/SessionResultPanels.tsx` — accept `sessionDate` + `notes`
  fallback, render retention line next to `audioActions`.
- `src/pages/SessionDetail.tsx` — drop the standalone Notes card and footer retention line, pass
  `notes` and the session date down.
- One data clean-up migration for the duplicate invoice documents.
