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

---

# Patient details: Next of Kin layout + Employer required with insurance

## Next of Kin on two rows

In the patient details editor (Next of Kin section, both view and edit modes), lay the fields out over two rows instead of a single long row:

```text
Row 1:  Name            Relationship
Row 2:  Phone           Email
```

Same two-row grid for each additional next-of-kin member card, and it collapses to one column on mobile.

## Employer becomes compulsory when Medical Insurance is captured

If the patient has an insurance provider / insurance number filled in but the Employer field is empty:

- Show an inline prompt on the Employer field: "Employer details are required when medical insurance is captured."
- Mark the Employer field with a required indicator while insurance is present.
- Saving with insurance present and no employer shows the validation message and keeps the section open instead of saving; the rest of the form is untouched when insurance is empty.
- A small notice appears in the Insurance section too, so the patient knows why Employer is being asked for.

## Technical notes

- `src/features/patients/components/PatientDetailsEditor.tsx`: two-column grid for the next-of-kin fields; derive `insuranceCaptured = !!(medical_aid || medical_aid_number)` and gate save on `employer` when true, surfacing the error via the existing form error/toast pattern.
