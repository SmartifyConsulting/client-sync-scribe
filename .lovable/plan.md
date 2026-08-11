# Restore default header/footer and clean up duplicate templates

## What's wrong today (verified against the database)

- **Duplicate document templates:** 101 template rows exist across 10 accounts, but most accounts hold 2 copies (one holds 3) of every default template — Prescription, Invoice, Medical Certificate, Referral Letter, General Letterhead, Hospital Admission Form, and the two programme templates. The duplicates were inserted within milliseconds of each other, i.e. the seeding routine ran twice concurrently.
- **Templates have no letterhead attached:** 97 of the 101 templates have both `header_template_id` and `footer_template_id` empty, so documents render with no letterhead unless a doctor picks one by hand each time.
- **Missing letterheads:** 45 templates belong to accounts that have no letterhead record at all, so there is nothing for them to default to. The 17 accounts that do have a letterhead each have exactly one, already flagged as default.

## What will change

### 1. Restore a default header and footer for every account
Every account that owns document templates but has no letterhead gets the standard seeded letterhead created (the same "Header and Footer" record other accounts have, flagged as default). Accounts that already have one are left untouched — no existing letterhead content is overwritten.

### 2. Remove duplicate templates
For each account, keep only the oldest copy of each template name and delete the rest. Any document already linked to a removed copy is repointed to the surviving copy first, so nothing loses its template.

### 3. Attach the default letterhead to every template
Each template with no header selected gets the account's default letterhead as its header, and the same for footer. Templates where the doctor has already chosen a letterhead keep their choice.

### 4. Stop it happening again
- A uniqueness rule on template name per account, so a second concurrent seed can no longer create a duplicate.
- The seeding routine inserts with conflict-ignore, and stamps newly seeded templates with the account's default letterhead for header and footer.
- If an account somehow has no letterhead when templates are seeded, the default letterhead is created first.

In the Header/Footer dropdowns the seeded letterhead keeps showing as "Default Header" / "Default Footer" (already the case), so restored records read sensibly.

## Technical notes

- **Migration:**
  - Insert the standard letterhead (`name = 'Header and Footer'`, `is_default = true`) into `header_footer_templates` for every `user_id` present in `templates` but absent from `header_footer_templates`.
  - Repoint `documents.template_id` (and any other FK referencing `templates`) from duplicate rows to the surviving oldest row per `(user_id, name)`, then delete the duplicates.
  - `UPDATE templates SET header_template_id = COALESCE(header_template_id, <default letterhead id>), footer_template_id = COALESCE(footer_template_id, <default letterhead id>)` joined on the owner's default letterhead.
  - `CREATE UNIQUE INDEX templates_user_name_key ON public.templates (user_id, name)` after the dedupe.
- **`src/hooks/useTemplates.ts`:** seed inserts use `.upsert(..., { onConflict: 'user_id,name', ignoreDuplicates: true })`; before seeding, ensure a default letterhead exists and set `header_template_id`/`footer_template_id` on each seeded row.
- No changes to `TemplateForm.tsx` label mapping or the existing default-selection effect.
