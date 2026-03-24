

# Fix: Document Preview Shows Raw HTML for All Auto-Generated Documents

## Problem
The `DocumentPreview` component's `renderFormattedContent` function escapes all HTML tags, then only whitelists `<b>`, `<i>`, `<u>`. All auto-generated documents (Invoices, Prescriptions, Medical Certificates, Referral Letters, General Letters, Hospital Admission Forms) use full HTML markup (`<h2>`, `<p>`, `<strong>`, `<table>`, etc.), which gets displayed as raw escaped text.

## Solution

**File:** `src/components/sessions/DocumentPreview.tsx`

Replace the current escape-then-whitelist approach in `renderFormattedContent` with a placeholder-based method that preserves all safe HTML tags used across document types:

- **Block:** `h1`-`h4`, `p`, `div`, `br`, `hr`, `blockquote`
- **Inline:** `b`, `i`, `u`, `strong`, `em`, `span`, `sub`, `sup`
- **Table:** `table`, `thead`, `tbody`, `tr`, `td`, `th`
- **List:** `ul`, `ol`, `li`
- **Media:** `img` (with attributes)

Before escaping, extract safe tags into placeholders. Escape remaining content. Restore safe tags. This fixes preview rendering for all 6 document types.

Also apply the same fix to `renderFormattedContentForPrint` in `src/utils/documentExport.ts` so printing matches the preview.

## Files Modified

| File | Change |
|------|--------|
| `src/components/sessions/DocumentPreview.tsx` | Expand HTML whitelist to support all document markup |
| `src/utils/documentExport.ts` | Same whitelist expansion for print rendering |

