

# Fix: Mobile-Only Bottom Tab Navigation (Restore Desktop/iPad Layout)

## Problem
The section-based tab filtering currently applies to all screen sizes. On desktop and iPad, the original layout showed all tabs in a single scrollable row — which was working perfectly and should be preserved.

## Solution
Make the `section` filtering **mobile-only** by using a responsive check. On `md:` and above, all tabs remain visible as before (the full scrollable tab bar). The `BottomNav` already hides on `md:` screens, so this is consistent.

## Changes

### 1. `src/components/patients/PatientDetailsEditor.tsx`
- Import `useIsMobile` from `@/hooks/use-mobile`
- Change the `activeTabs` logic in both view and edit modes: only apply section filtering when `isMobile` is true
  - Before: `const activeTabs = isSelfService && section ? SECTION_TABS[section] || null : null;`
  - After: `const activeTabs = isMobile && isSelfService && section ? SECTION_TABS[section] || null : null;`
- Same change for `defaultValue`: only use section-based default on mobile; on desktop default to `"personal"` always
  - Before: `defaultValue={isSelfService && section ? (SECTION_TABS[section]?.[0] || "personal") : "personal"}`
  - After: `defaultValue={isMobile && isSelfService && section ? (SECTION_TABS[section]?.[0] || "personal") : "personal"}`

### 2. `src/components/layout/PatientAppLayout.tsx`
- Import `BottomNav` from `./BottomNav`
- Render `<BottomNav />` after `</main>` (it already has `md:hidden` so it won't show on desktop/iPad)
- Add `pb-20 md:pb-0` to `<main>` to prevent content from being hidden behind the fixed bottom nav on mobile

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Gate section filtering behind `isMobile` check |
| `src/components/layout/PatientAppLayout.tsx` | Add `<BottomNav />` and mobile bottom padding |

