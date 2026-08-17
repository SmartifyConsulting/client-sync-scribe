# Fix: Header template shows "Footer" underneath

## What actually happened

Your header and footer live in **one saved letterhead record**, but the Templates screen draws it as two cards ("Header" and "Footer"). Both cards print the record's single shared name underneath the card title.

When you edited the footer today at 19:47, the footer editor let you rename that shared record to "Footer". So the Header card now reads:

```text
Header
Footer          <- the shared record name
```

Your header content is still intact (practice names, MP numbers, cell numbers) — nothing was lost, only the label is wrong.

## The fix

1. **Repair the record name** — rename the letterhead back to "Header and Footer" so the Header card stops reading "Footer".
2. **Stop the footer editor renaming the shared letterhead** — when editing in footer-only (or header-only) mode, the Name field is hidden and the existing name is preserved on save. Renaming stays available only in the full letterhead editor.
3. **Clearer card captions** — the two cards show "Header" / "Footer" as the title and, underneath, the letterhead name in muted text prefixed so it reads as the source letterhead rather than the card's own name.
4. **Empty-side handling** — if a letterhead has no header content at all (a footer-only creation), only the Footer card is rendered, and vice versa, so you never see a blank "Header" card again.

## Technical notes

- `src/features/documents/templates/HeaderFooterTemplateForm.tsx`: hide the Name input for `edit-header-only` / `edit-footer-only`; keep `initialData.name` in the submitted payload. Keep the name input for `create-*-only` (new records still need a name).
- `src/pages/Documents.tsx`: in the header/footer grid, only emit the Header card when the record's `header` has any non-empty left/center/right text or image, and only emit the Footer card when `footer` does. Adjust caption text.
- One migration to set `name = 'Header and Footer'` on the affected letterhead record.
