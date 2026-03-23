

# Plan: Fix My Practice Headings, Merge Personal into Practice & Fix MyDoctors Heading

## Problems Found
1. **No section headings** inside Personal, Practice, Pricing, or Certificates tab panels.
2. **Referrals tab** renders `ReferralDoctors.tsx` as a standalone page with `text-3xl` h1 — visual mismatch.
3. **Personal tab still exists separately** instead of being merged into Practice.
4. **MyDoctors heading mismatch**: `MyDoctors.tsx` uses `text-2xl font-bold` for its "My Doctors" heading, while MyPractice section headings use `text-sm font-semibold` with an icon. When MyDoctors is embedded inside the "Doctors" tab (via `PatientDetailsEditor`), this creates an inconsistent heading size.

## Reference Style
All section headings must match this pattern (from Settings.tsx):
```tsx
<div className="flex items-center gap-2">
  <Icon className="h-4 w-4 text-primary" />
  <h3 className="text-sm font-semibold text-foreground">Section Title</h3>
</div>
```

## Changes

### File: `src/pages/MyPractice.tsx`
1. Remove the "Personal" tab from TabsList and its TabsContent.
2. Move Personal fields to the top of the Practice tab with a "Personal Information" sub-heading.
3. Add consistent `text-sm font-semibold` headings with icons to all tab panels: Practice Details, Referral Doctors, Pricing, Certificates.
4. Default tab changes from `"personal"` to `"practice"`.

### File: `src/pages/ReferralDoctors.tsx`
5. Add `hideHeader` prop. When true, skip the standalone `text-3xl` page header and reduce spacing.
6. In MyPractice, render `<ReferralDoctors hideHeader />` with a matching section heading above it.

### File: `src/pages/patient/MyDoctors.tsx`
7. When `hideHeader` is false (standalone page), keep the current heading.
8. When embedded in tabs (the common case), the heading "My Doctors" currently uses `text-2xl font-bold` — change it to match the standard pattern: `text-sm font-semibold text-foreground` with a `Stethoscope` icon (`h-4 w-4 text-primary`), and update the subtitle to `text-xs text-muted-foreground`. This ensures the "My Doctors" heading matches "Personal Information" and all other section headings.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Remove Personal tab, merge fields into Practice, add consistent headings |
| `src/pages/ReferralDoctors.tsx` | Add `hideHeader` prop for embedded use |
| `src/pages/patient/MyDoctors.tsx` | Standardize heading to `text-sm font-semibold` with icon to match other sections |

