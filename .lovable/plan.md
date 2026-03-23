

# Plan: Fix My Practice Tab Headings & Merge Personal into Practice

## Problems Found
1. **No section headings** inside Personal, Practice, Pricing, or Certificates tab panels — they jump straight into form fields or descriptions.
2. **Referrals tab** renders `ReferralDoctors.tsx` as a standalone page with its own `text-3xl` h1 and `space-y-6` layout, creating a visual mismatch.
3. **Personal tab still exists separately** instead of being merged into Practice (as previously requested).

## Reference Style
The target heading style (from Settings.tsx "Patient Management" / "Calendar Integration"):
```tsx
<div className="flex items-center gap-2">
  <Icon className="h-4 w-4 text-primary" />
  <h3 className="text-sm font-semibold text-foreground">Section Title</h3>
</div>
```

## Changes

### File: `src/pages/MyPractice.tsx`

1. **Remove the "Personal" tab** from the TabsList and its TabsContent.

2. **Move Personal fields to the top of the Practice tab**, inside the existing card, above the current Practice Number / Registration Number fields. Add a sub-heading "Personal Information" using the reference style.

3. **Add consistent section headings** at the top of each tab panel's card content:
   - Practice tab: "Personal Information" heading (for the moved fields), then "Practice Details" heading (before practice number, logo, partners)
   - Pricing tab: "Pricing" heading
   - Certificates tab: "Certificates" heading

   All headings use the same pattern: `text-sm font-semibold text-foreground` with an icon (`h-4 w-4 text-primary`).

4. **Default tab** changes from `"personal"` to `"practice"`.

### File: `src/pages/ReferralDoctors.tsx`

5. **Add `hideHeader` prop** (optional boolean). When true, skip rendering the standalone page header (`<h1 className="text-3xl">Referrals</h1>`), reduce outer spacing from `space-y-6` to `space-y-4`, and wrap content in the standard card shell (`rounded-xl border border-border bg-card p-4 shadow-sm`).

6. In `MyPractice.tsx`, render `<ReferralDoctors hideHeader />` inside the Referrals tab, with a consistent section heading "Referral Doctors" above it matching the same style.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Remove Personal tab, merge fields into Practice, add consistent `text-sm font-semibold` headings to all tabs |
| `src/pages/ReferralDoctors.tsx` | Add `hideHeader` prop to support embedded use without standalone page header |

