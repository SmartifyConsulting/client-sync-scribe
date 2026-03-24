

# Fix: Invoice (and Prescription) Preview Missing Header/Footer Template

## Problem
The `InvoiceEditor` and `PrescriptionEditor` generate plain text content and pass it directly to `DocumentPreview` without using the `useTemplateWithHeaderFooter` hook. Other document editors (Referral Letter, Medical Certificate, General Letter, Hospital Admission) correctly use this hook to wrap content with the user's header/footer template (practice details, logo, contact info).

The screenshot shows the invoice displaying raw practice details as body text instead of a properly structured header.

## Solution

### File: `src/components/sessions/InvoiceEditor.tsx`
- Import and use `useTemplateWithHeaderFooter("Invoice")` 
- Use the returned `headerFooter` to get logo URL and font family
- Use `formattedContent` as the base template, replacing placeholders with invoice data
- Pass `logoUrl` and `fontFamily` from the header/footer template to `DocumentPreview`

### File: `src/components/sessions/PrescriptionEditor.tsx`
- Same pattern: import `useTemplateWithHeaderFooter("Prescription")`
- Wrap generated prescription content with header/footer template
- Pass `logoUrl` and `fontFamily` to `DocumentPreview`

### Pattern (from working editors like ReferralLetterEditor):
```
const { formattedContent, headerFooter } = useTemplateWithHeaderFooter("Invoice");
// Use formattedContent as base, replace placeholders
// Pass headerFooter?.header?.center?.imageUrl as logoUrl
// Pass headerFooter?.font_family as fontFamily
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/sessions/InvoiceEditor.tsx` | Add `useTemplateWithHeaderFooter`, wrap content with header/footer |
| `src/components/sessions/PrescriptionEditor.tsx` | Same — add header/footer template integration |

