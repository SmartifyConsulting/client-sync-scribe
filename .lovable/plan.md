

# Plan: Nav Reorder, Holarchive Tab Updates, and Moola Icon Changes

## Changes

### 1. Sidebar Nav Reorder (`src/components/layout/Sidebar.tsx`)
Move "My Practice" above "My Holarchive" in `doctorNavItems`:
```
Dashboard → My Practice → My Holarchive → Calendar → Sessions → To-Do List → My Rewards
```

### 2. Add "My Practice" Tab to Holarchive (`src/components/patients/PatientDetailsEditor.tsx`)
In both view and edit mode tab lists, add a new tab trigger (only when `isSelfService` and user is a doctor):
- Add a "My Practice" tab as the last tab
- Clicking it navigates to `/practice` using `useNavigate()` instead of rendering inline content
- Implementation: use an `onClick` handler on the tab trigger that calls `navigate("/practice")` and prevents tab switching

### 3. Rename "Patient Details" to "My Details" (`src/components/patients/PatientDetailsEditor.tsx`)
- Line 335: Change heading from "Patient Details" to "My Details"
- This label appears in the view mode header above the tabs

### 4. Revert Moola Logo to "M" Symbol (`src/components/gamification/LollipopDisplay.tsx`)
Replace the `MoolaLogoBadge` component: instead of rendering the `moolasLogo` PNG, render a styled "M" text character in a colored circle. Remove the `moolasLogo` import.

Sizes:
- `sm`: 20px circle, small M text
- `md`: 28px circle, medium M text  
- `lg`: 40px circle, large M text

Style: Bold "M" in white on a `bg-secondary` circle.

### 5. Increase Moola Icon Size on Dashboard (`src/components/dashboard/StatsCard.tsx`)
When `imageUrl` is not used (since we're removing the logo), the Moola stats card uses the `Award` icon. To make it more prominent:
- In `Dashboard.tsx`, remove the `imageUrl={moolasLogo}` prop and the `moolasLogo` import
- In `StatsCard.tsx`, increase the icon container and icon size — but only for specific cards would be complex. Instead, simply remove `imageUrl` usage from the Moola card so it uses the `Award` icon at the existing size.

Alternative: Replace the `imageUrl` approach on the Moola StatsCard with a custom larger `MoolaLogoBadge` rendered via a new prop or by replacing the StatsCard with a custom Moola card that shows a large prominent "M" symbol. 

**Chosen approach**: Remove `imageUrl` from the Moola StatsCard in Dashboard.tsx. Instead, render the `MoolaLogoBadge` with `size="lg"` directly in a custom prominent display. Update the StatsCard icon container to be larger (h-16 w-16) when the card is the Moola card — or simpler: just pass `imageUrl` but render the M badge inline. 

Simplest: Keep using `StatsCard` but replace the `imageUrl` with rendering a custom icon. Since `StatsCard` accepts `icon`, we can create a wrapper. Actually the simplest is:
- Remove `moolasLogo` import from Dashboard.tsx
- Remove `imageUrl` prop from the Moola StatsCard — it will then render the `Award` icon normally
- To make the M more prominent on the dashboard, add a dedicated Moola display section or increase the icon size in StatsCard when it's the Moola card

**Final approach**: 
- `MoolaLogoBadge` becomes a styled "M" circle component (no PNG)
- In `Dashboard.tsx`, replace the `imageUrl={moolasLogo}` with nothing — use the `Award` icon, but also add a `size="lg"` class to make it bigger. Since StatsCard doesn't support per-card sizing easily, we'll add an optional `iconSize` prop to StatsCard (`"default" | "large"`) and pass `iconSize="large"` for the Moola card, rendering a larger icon container (h-16 w-16 with h-9 w-9 icon).

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Swap My Practice above My Holarchive |
| `src/components/patients/PatientDetailsEditor.tsx` | Add "My Practice" tab (navigates to /practice), rename "Patient Details" → "My Details" |
| `src/components/gamification/LollipopDisplay.tsx` | Replace PNG logo with styled "M" circle, remove moolasLogo import |
| `src/components/dashboard/StatsCard.tsx` | Add optional `iconSize` prop for larger icon rendering |
| `src/pages/Dashboard.tsx` | Remove `moolasLogo` import, remove `imageUrl` prop, add `iconSize="large"` to Moola card |

