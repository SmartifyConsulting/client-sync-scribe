

# Plan: Font Reduction, Nav Restructure, Notifications Enhancement, Moola Logo Resize

## 1. Reduce All Font Sizes by 30% (except To-Do section and nav items)

**File: `src/index.css`**
- Change base body font from `15px` to `10.5px` (30% reduction)
- Add exclusion classes for To-Do section and nav menu items to preserve their current sizes

**File: `src/components/dashboard/CompactTodoList.tsx`**
- Wrap the component's root in a class that resets font size to the original `15px` base

**File: `src/components/layout/Sidebar.tsx`**
- Add a class to the nav items section preserving `text-sm` (14px) sizing

**File: `src/components/layout/BottomNav.tsx`**
- Preserve current nav font sizes with explicit sizing class

## 2. Remove "Patients" from Doctor Nav Bar → List in Doctor's Holarchive

**File: `src/components/layout/Sidebar.tsx`**
- Remove `{ icon: Users, label: "Patients", to: "/patients" }` from `doctorNavItems`

**File: `src/components/layout/BottomNav.tsx`**
- Remove Patients from `doctorNavItems`

**File: `src/pages/Profile.tsx`**
- For doctors: instead of showing "settings have moved" card, render a doctor Holarchive view that includes a "My Patients" tab embedding the patients list (from `src/pages/Patients.tsx` content)

## 3. Remove "Connections" from Nav Bar → Show in Notifications Popup

**File: `src/components/layout/Sidebar.tsx`**
- Remove `{ icon: Users2, label: "Connections", to: "/connections" }` from `doctorNavItems`

**File: `src/pages/Dashboard.tsx`**
- Enhance the notifications popover to include connection requests/invitations alongside regular notifications
- Add a **"Clear"** button per notification record that deletes/marks-as-dismissed that single notification
- Add a **"Clear All"** button at the top of the notifications popup header
- When "Clear" is clicked on a notification, it should no longer appear (mark as read + dismissed, or delete)

## 4. Resize Moola Logo to Match Doctor Rating Star Badge

**File: `src/components/dashboard/StatsCard.tsx`**
- When `imageUrl` is provided, remove the white circle container (`rounded-full bg-white shadow-sm p-1`)
- Render the image at the same size as the regular icon badge (same `h-7 w-7` as the Icon, inside the same `rounded-2xl bg-primary/10` container)

**File: `src/components/gamification/LollipopDisplay.tsx`**
- Update `MoolaLogoBadge` to remove the white circle background, just render the logo directly

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Reduce base font to ~10.5px |
| `src/components/dashboard/CompactTodoList.tsx` | Preserve original font size |
| `src/components/layout/Sidebar.tsx` | Remove Patients + Connections; preserve nav font size |
| `src/components/layout/BottomNav.tsx` | Remove Patients; preserve nav font size |
| `src/pages/Profile.tsx` | Doctor view: show Holarchive with embedded patients list |
| `src/pages/Dashboard.tsx` | Enhance notifications popup: per-item Clear button + Clear All; include connections |
| `src/components/dashboard/StatsCard.tsx` | Remove white circle from image icon, match regular icon size |
| `src/components/gamification/LollipopDisplay.tsx` | Remove white circle from MoolaLogoBadge |

