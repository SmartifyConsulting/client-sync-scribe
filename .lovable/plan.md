

# Nav Reorder, Patient List Compaction, Invitation Redesign, Briefing Enhancement, Recent Activity Move

## Summary
Seven groups of changes: move Rewards last in doctor nav, remove email column from patient list on mobile, redesign doctor access request cards, remove "Appointments Today" stats card, show dynamic completion count in TodaysBriefing, and move Recent Activity below the to-do list on mobile.

## Changes

### 1. Move Rewards last in doctor bottom nav
**File:** `src/components/layout/BottomNav.tsx`
- Reorder `doctorNavItems`: Home, Patients, Sessions, Practice, Admin, Rewards

### 2. Remove Contact column from patient list on mobile, compact columns
**File:** `src/pages/Patients.tsx`
- Hide "Contact" column on mobile with `hidden md:table-cell`
- Reduce padding on remaining columns from `px-4` to `px-2` on mobile

### 3. Redesign DoctorAccessRequests invitation cards
**File:** `src/components/doctor/DoctorAccessRequests.tsx`
- Redesign each request as a rounded card with avatar circle (initials), patient name prominently displayed
- Message text: "[Patient Name] has invited you on her panel of healthcare providers and has provided access to their health information."
- Date/time stamp below message
- Decline (outline) and Accept (primary filled) buttons at bottom

### 4. Remove "Appointments Today" stats card
**File:** `src/pages/Dashboard.tsx`
- Remove the "Appointments Today" `StatsCard`

### 5. Dynamic appointment completion in TodaysBriefing
**File:** `src/components/dashboard/TodaysBriefing.tsx`
- Change subtitle to "{date} • {completed} of {total} appointments completed"
- Count appointments with `start_time` before now as completed

### 6. Move Recent Activity below the to-do list on mobile
**File:** `src/pages/Dashboard.tsx`
- Restructure the main content grid so that on mobile, the order is: TodaysBriefing → CompactTodoList → RecentActivity
- On desktop, keep the current 3+2 column layout (briefing + activity left, todos right)
- On mobile (`< lg`), render as single column: TodaysBriefing, CompactTodoList, then RecentActivity last

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Move Rewards to last position |
| `src/pages/Patients.tsx` | Hide Contact column on mobile, compact padding |
| `src/components/doctor/DoctorAccessRequests.tsx` | Redesign invitation cards with patient name and message |
| `src/pages/Dashboard.tsx` | Remove Appointments Today card, reorder mobile layout |
| `src/components/dashboard/TodaysBriefing.tsx` | Show dynamic completion count |

