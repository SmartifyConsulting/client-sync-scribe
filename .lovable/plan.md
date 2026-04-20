

# Plan: Letterhead Picker per Template + To-Do Preview Fallback

Two coordinated fixes so headers/footers always render, **and** so doctors with multiple letterheads can choose which one each template uses.

---

## Part A — Letterhead picker per template (new)

### Problem
Right now `templates.header_footer_template_id` exists in the schema, but the **TemplateForm UI doesn't expose it** for the 6 default templates (Invoice, Prescription, Medical Certificate, Referral Letter, Hospital Admission Form, General Letterhead). So doctors with more than one letterhead have no way to say *"use Letterhead B for invoices, Letterhead A for everything else."*

### Changes

**1. `src/components/templates/TemplateForm.tsx`** *(already has the picker for custom templates — verify and reuse)*
- Confirm the existing `<Select>` "Header & Footer Template" block is reachable from every template-edit entry point (custom **and** the 6 defaults). If the 6 defaults are edited via a different form, surface the same selector there.
- Default the dropdown to the doctor's `is_default = true` letterhead when none is linked yet.
- Include a **"None"** option (renders body without letterhead).

**2. `src/pages/MyPractice.tsx` / Templates tab**
- For each of the 6 default template cards, show the currently-linked letterhead name as a small caption ("Letterhead: *Holarc Main*") so doctors see the link at a glance.
- Edit action opens TemplateForm (or its default-template equivalent) with the picker pre-populated.

**3. `useTemplates` save path**
- Persist `header_footer_template_id` (already a column) on insert/update — no schema change required.

**4. `src/hooks/useDocumentHeaderFooter.ts`** *(extend the lookup chain)*
Resolution order becomes:
1. `templates` row (author + `template_name`) → `header_footer_template_id` *(per-template choice — this is the new path)*
2. Author's letterhead with `is_default = true`
3. **Last-resort fallback**: any letterhead owned by the author, ordered `is_default DESC, created_at ASC`, take first

Step 3 guarantees a doctor with a single (un-flagged) letterhead always gets it applied — which is why the To-Do preview is currently blank.

---

## Part B — Heal historical data so existing letterheads start working immediately

One-time SQL migration: for any user who owns **exactly one** `header_footer_templates` row, set `is_default = true` on it. Idempotent and scoped.

```sql
UPDATE public.header_footer_templates hf
SET is_default = true
WHERE NOT hf.is_default
  AND (
    SELECT count(*) FROM public.header_footer_templates
    WHERE user_id = hf.user_id
  ) = 1;
```

---

## Part C — Wire up the To-Do preview (already approved, kept here for clarity)

Already done in the prior change: `TodoList.tsx` uses `useDocumentHeaderFooter(previewDoc)` instead of the hard-coded `"General"` lookup. With Parts A + B above, the resolution now succeeds end-to-end.

---

## Out of scope

- No visual redesign of `DocumentPreview` or the templates list.
- No changes to RLS (existing policies cover both reads).
- No schema changes (column already exists).

## Files touched

| File | Change |
|---|---|
| `src/components/templates/TemplateForm.tsx` | Ensure letterhead `<Select>` is present and defaulted; verify it's used by all template edit flows |
| `src/pages/MyPractice.tsx` (Templates tab) | Show linked letterhead name on each default-template card; route edit to TemplateForm |
| `src/hooks/useTemplates.ts` | Persist `header_footer_template_id` on save (if not already) |
| `src/hooks/useDocumentHeaderFooter.ts` | Add "any owned letterhead" last-resort fallback after `is_default` |
| `supabase/migrations/<ts>_default_solo_letterhead.sql` | Mark sole letterheads as default |

