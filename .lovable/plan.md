

# Updated Plan: Nav Renaming, Compact Banner Fix, Sub-tab Styling

## Summary
Three additions to the existing plan:
1. Remove "Earned:" text from the compact banner on non-Home mobile sections to save space for large Vula numbers
2. Rename bottom nav item "My Vulas" → "My Rewards"
3. Make Personal Information / Medical Information sub-tabs more visually pronounced (stronger background contrast)

## Changes

### 1. Remove "Earned:" from CompactBanner
**File:** `src/components/patients/PatientDetailsEditor.tsx` (~line 1398)

Remove the `<span className="text-xs text-muted-foreground">Earned:</span>` element from the compact banner. The Vula Vouchers logo + number alone is sufficient context.

### 2. Rename "My Vulas" → "My Rewards" in bottom nav
**File:** `src/components/layout/BottomNav.tsx` (line 29)

Change: `{ icon: Gift, label: "My Vulas", section: "rewards" }` → `{ icon: Gift, label: "My Rewards", section: "rewards" }`

### 3. Make Personal/Medical sub-tabs more pronounced
**File:** `src/components/patients/PatientDetailsEditor.tsx` (~line 1330)

The sub-tab `TabsList` currently uses `bg-muted` which is nearly white. Change to a stronger background:
- `TabsList`: change from `bg-muted` to `bg-primary/15` (light teal background matching brand)
- Active `TabsTrigger`: add `data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm` for clear active state contrast

This applies to the My Profile sub-tabs (Personal Information / Medical Information) at ~line 1330, and similarly to the My Healthcare and My Desk sub-tab rows.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Rename "My Vulas" → "My Rewards" |
| `src/components/patients/PatientDetailsEditor.tsx` | Remove "Earned:" text from CompactBanner; strengthen sub-tab styling with `bg-primary/15` background and contrasting active state |

