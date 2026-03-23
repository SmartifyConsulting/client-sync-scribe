

# Multi-Feature Update: Search Text, Rename Doctors, Moola Apps Tab, Persistent Header Icons, Green M Icon

## 1. Fix Search Description & Placeholder (MyDoctors.tsx)

**File:** `src/pages/patient/MyDoctors.tsx`

- Line 188: Change `"Search by full name or practice number"` to `"Search by full name, practice number, or registration number"`
- Line 195: Change placeholder to `"Search by name, practice number, or registration number..."`
- Also update the search query logic (line 75) to include `doctor_number` in the `.or()` filter: add `doctor_number.eq.${query}`

## 2. Remove Duplicate "Invite Doctor" Button (MyDoctors.tsx)

**File:** `src/pages/patient/MyDoctors.tsx`

- Line 181: Remove the standalone `<InviteDoctorDialog />` from the header area (top-right of the page). The search results table already has per-row invite buttons, making this redundant.

## 3. Rename "Doctors" to "Healthcare Providers" Throughout

**Files affected:**
- `src/pages/patient/MyDoctors.tsx`: "My Doctors" heading (line 174), "Find a Doctor on Holarc" (line 187), "No doctors found" (line 209), "No doctors on your profile" (line 265), table headers "Doctor" (lines 216, 269)
- `src/pages/patient/PatientDashboard.tsx`: "My Healthcare Providers" heading (line 471) — already correct; check "No doctors connected yet" (line 483), "Invite a doctor" (line 485)
- `src/components/patient/InviteDoctorDialog.tsx`: Dialog title and button label references

## 4. Add "Moola Apps" Tab to Both Rewards Pages

**Files:** `src/pages/patient/MyRewards.tsx` and `src/pages/doctor/DoctorRewards.tsx`

Add a new tab called "Moola Apps" to each page's `<TabsList>`. This tab will display all available partner apps from the `moola_partner_apps` table (already queried in both files). The tab content will show:
- A grid of partner app cards with name, logo, and active status
- Brief description of what Moola Apps are ("Apps and services that accept Moolas as currency")
- Both pages already query `moola_partner_apps`, so no new data fetching is needed

## 5. Persist Mic, Bell, and Avatar Icons Across All Screens

**File:** `src/components/layout/AppLayout.tsx`

Add a persistent top-right icon bar to `AppLayout` that renders on desktop (the mobile header already exists). This bar will contain:
- Microphone icon (links to `/todos?autoRecord=true`)
- Notification bell with unread count badge (same popover pattern as Dashboard)
- User avatar with profile popover (same as Dashboard)

This replaces the per-page header icons currently duplicated in `Dashboard.tsx` and `PatientDashboard.tsx`. The existing per-page header icons in those files will be simplified to just show the welcome text (remove the bell/avatar/mic from individual pages to avoid duplication).

**New file:** `src/components/layout/TopBarIcons.tsx` — extracted shared component with mic, bell, and avatar, used by AppLayout.

## 6. Use Green M Icon for "My Moolas Balance" on Patient Dashboard

**File:** `src/pages/patient/PatientDashboard.tsx`

- Line 3: Change `import moolasLogo from "@/assets/moolas-logo.png"` to `import moolaSymbol from "@/assets/moola-symbol.png"` (the green M icon)
- Line 384: Update the image src from `moolasLogo` to `moolaSymbol`

## Files Modified

| File | Change |
|------|--------|
| `src/pages/patient/MyDoctors.tsx` | Add registration number to search; remove duplicate Invite button; rename Doctors to Healthcare Providers |
| `src/pages/patient/PatientDashboard.tsx` | Use green M icon; rename doctor references; remove header icons (moved to layout) |
| `src/pages/Dashboard.tsx` | Remove header icons (moved to layout) |
| `src/pages/patient/MyRewards.tsx` | Add "Moola Apps" tab |
| `src/pages/doctor/DoctorRewards.tsx` | Add "Moola Apps" tab |
| `src/components/layout/TopBarIcons.tsx` | New shared component for mic, bell, avatar |
| `src/components/layout/AppLayout.tsx` | Add persistent TopBarIcons |
| `src/components/patient/InviteDoctorDialog.tsx` | Rename "Doctor" references to "Healthcare Provider" |

