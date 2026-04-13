

# Replace Sidebar with Horizontal Tabs, Chronic Badge Icon-Only on Mobile

## Summary
Remove left sidebar on web/tablet, replace with horizontal tab navigation below dashboard cards. Also reduce the chronic badge to icon-only on mobile with a tooltip.

## Changes

### 1. Remove sidebar from AppLayout
**File:** `src/components/layout/AppLayout.tsx`
- Remove `<Sidebar />` block and `md:ml-[210px]` offset

### 2. Add horizontal tab navigation to Dashboard (md+ screens)
**File:** `src/pages/Dashboard.tsx`
- Add a `Tabs` component visible only on `md+` screens, placed below the stats cards
- Five tabs: **Today** (default), **Patients**, **Practice**, **Admin**, **Rewards**
- Each tab renders its corresponding page component inline (`Patients`, `MyPractice`, `Admin`, `DoctorRewards`)
- Today tab shows the existing dashboard body (briefing, to-do, recent activity, round tables)
- Mobile layout remains unchanged (bottom nav handles navigation)

### 3. Chronic badge: icon-only on mobile with tooltip
**File:** `src/pages/Patients.tsx`
- Wrap the chronic badge in a `Tooltip` component
- On mobile: show only the `Pill` icon (hide the "Chronic" text via `hidden md:inline`)
- On desktop: show the full "Chronic" text alongside the icon as before
- Tooltip text: "Chronic Patient" — appears on click/tap of the icon

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/AppLayout.tsx` | Remove sidebar and ml offset |
| `src/pages/Dashboard.tsx` | Add horizontal Tabs (Today/Patients/Practice/Admin/Rewards) for md+ screens |
| `src/pages/Patients.tsx` | Chronic badge icon-only on mobile with tooltip |

