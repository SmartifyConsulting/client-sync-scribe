# Multi-Layout Cleanup, Patient List Redesign, Admin Tabs, Sessions Removal, Pricing Fix

## Summary

Remove left sidebar from all views, remove Sessions from nav, redesign patient list status column, compact patient profile cards, fix invitation wording, rename tab, fix pricing access, and add Calendar and To-Do tabs to the Admin page.

## Changes

### 1. Remove left sidebar from all layouts

**File:** `src/components/layout/AppLayout.tsx`

- Remove the sidebar block and its margin offset from the main content area

### 2. Remove Sessions from bottom nav

**File:** `src/components/layout/BottomNav.tsx`

- Remove `{ icon: Mic, label: "Sessions", to: "/sessions" }` from `doctorNavItems`
- Final order: Home, Patients, Practice, Admin, Rewards

### 3. Patient list: Replace Status column with inline dot

**File:** `src/pages/Patients.tsx`

- Remove the "Status" column header
- Add a small green (active) or red (inactive) dot inline after the patient name
- Compact padding on Last Seen and Since columns so Actions is visible without scrolling

### 4. Patient profile: Status dot in header, remove Status card, 4 cards in one row

**File:** `src/pages/PatientProfile.tsx`

- Add green/red dot next to patient name in the header banner
- Remove the "Status" stats card; fit remaining 4 cards in a single `grid-cols-4` row
- Rename "H/Care Providers" tab to "Healthcare Providers"

### 5. Invitation wording change

**File:** `src/components/doctor/DoctorAccessRequests.tsx`

- Change message to: "{Patient Name} has invited you on their panel of healthcare providers and has provided access to their health information."

### 6. Fix pricing access for doctors

**File:** `src/pages/admin/PricingAdmin.tsx`

- Allow doctors (not just admins) to access pricing management
- **Database migration:** Add RLS policies on `pricing_config` for doctor role to SELECT, UPDATE, and INSERT

### 7. Add Calendar and To-Do tabs to Admin page

**File:** `src/pages/Admin.tsx`

- Add two new tabs before Pricing: "Calendar" and "To-Do"
- Calendar tab renders the existing `CalendarView` component
- To-Do tab renders the existing `TodoList` component
- Tab order: Calendar, To-Do, Pricing, Invoices, Templates
- Default tab changes to "calendar"

## Files Modified


| File                                             | Changes                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `src/components/layout/AppLayout.tsx`            | Remove sidebar, remove ml offset                                     |
| `src/components/layout/BottomNav.tsx`            | Remove Sessions nav item                                             |
| `src/pages/Patients.tsx`                         | Replace Status column with inline dot, compact columns               |
| `src/pages/PatientProfile.tsx`                   | Add status dot to header, remove Status card, 4-col grid, rename tab |
| `src/components/doctor/DoctorAccessRequests.tsx` | Update invitation wording                                            |
| `src/pages/admin/PricingAdmin.tsx`               | Allow doctor role access                                             |
| `src/pages/Admin.tsx`                            | Add Calendar and To-Do tabs before Pricing                           |
| Database migration                               | Add doctor RLS policies on pricing_config                            |
