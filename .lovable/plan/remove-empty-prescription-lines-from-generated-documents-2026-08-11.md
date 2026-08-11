# Remove empty prescription lines from generated documents

## Problem

The Prescription template has three fixed medication slots:

```text
1. [Medication1]
   Dosage: [Dosage1]
   Quantity: [Quantity1]
   Instructions: [Instructions1]

2. [Medication2]
   ...
```

When a prescription has fewer than three medications (or a medication has no dosage/quantity/instructions), the placeholders resolve to an empty string but the surrounding text stays. The document then shows leftover skeleton lines like `2.`, `Dosage:`, `Quantity:`, `Instructions:` with nothing after them.

## Fix

Add a clean-up pass in the shared placeholder filler (`src/features/documents/lib/fillDocumentPlaceholders.ts`), applied after tokens are resolved:

1. Track which placeholders resolved to an empty value for indexed prescription slots (this data is already computed as `slotKeys`).
2. Drop any line that consisted only of a label plus an empty slot value — e.g. `Dosage:`, `Quantity:`, `Instructions:`, `Frequency:`, a bare list marker (`2.`, `-`, `•`), or a label with nothing after the colon.
3. Renumber the remaining medication entries so the list reads 1, 2, 3 with no gaps.
4. Collapse the blank-line runs left behind so spacing stays tight.
5. Apply the same rule to other single-line optional fields that are already blank-rendered, so `Special Instructions:` and `Repeats:` disappear when there is no value, instead of showing `___`.

Handle both line-separated content and `<br>`-separated content, since prescription templates exist in both forms in the database.

## Scope

- Only affects rendering/filling of document content — no schema or template rows are changed.
- Existing templates keep their three slots; the empty ones simply do not render.
- Non-prescription documents are unaffected because the rule only fires on the indexed prescription slots and explicitly optional fields.

## Technical detail

File: `src/features/documents/lib/fillDocumentPlaceholders.ts`

- Extend the replacement step to record the set of tokens that resolved empty.
- New post-processing helper `pruneEmptyPrescriptionLines(content, emptyTokens)` that splits on `\n` and `<br>`, removes label-only lines, renumbers `^\s*\d+\.` entries, and rejoins with the original separator.
- Wire it into `fillDocumentPlaceholders` before the `INV-` dedupe step so every preview, print, email and PDF path benefits (all of them route through this function).
