

# MyDoctors Compaction, InviteDoctor Cleanup, Permission Layout, Notification & Invitation Styling

## Summary
Seven changes: reduce spacing in MyDoctors page, compact search results table, remove name search from invite modal, make Permission Transparency two-column layout, create notification on patient invite, green-border invitation cards with full patient name, all across M/T/W.

## Changes

### 1. Eliminate padding below headings in MyDoctors
**File:** `src/pages/patient/MyDoctors.tsx`
- Change `space-y-6` on root div to `space-y-3`
- Remove `CardHeader` padding: change `pb-3` to `pb-1` on the search card header
- Remove `CardDescription` or reduce margin

### 2. Compact search results table — even column distribution
**File:** `src/pages/patient/MyDoctors.tsx`
- For search results table, change column widths to distribute evenly: Provider gets flex space, Specialty visible on all viewports (remove `hidden sm:table-cell`), Action column stays narrow
- Reduce row padding and avatar sizes for tighter fit
- Same treatment for the connected doctors table below

### 3. Remove "Search by Name" from InviteDoctorDialog
**File:** `src/components/patient/InviteDoctorDialog.tsx`
- Remove the entire "Search by Name" section (lines 254-312): the label, input, suggestions dropdown, and invite-by-email fallback
- Remove related state: `nameSearch`, `suggestions`, `showSuggestions`, `searchingDoctors`, `inviteEmail`, `sendingInvite`, `selectedDoctorId`
- Remove the debounced search `useEffect` for name search
- Keep practice number and registration number fields

### 4. Two-column layout for Permission Transparency (Shared | Private)
**File:** `src/components/permissions/PermissionTransparencyModal.tsx`
- Change the content wrapper from vertical `space-y-5` to a two-column grid: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Column 1: "Shared with Care Team" section
- Column 2: "Private — Not Shared" section
- Keep the holistic nudge and warning below spanning full width
- Widen the dialog to `sm:max-w-[700px]` to accommodate two columns

### 5. Create notification when patient sends invite to doctor
**File:** `src/components/patient/InviteDoctorDialog.tsx`
- After inserting/updating the `doctor_access_requests` record, look up the doctor's user ID by practice number
- Insert a notification row: `{ user_id: doctorUserId, type: 'access_request', title: 'Patient Invitation', description: '{patientName} has invited you...', is_read: false }`
- This triggers the bell icon count via the existing realtime subscription

### 6. Green border on doctor invitation cards + show full patient name
**File:** `src/components/doctor/DoctorAccessRequests.tsx`
- Change card border from `border-border` to `border-green-500` (green border)
- The patient name is already fetched and displayed — ensure it shows the full name prominently (it already does via `patient_profile?.full_name`)

### 7. Responsive consistency
All changes apply to all viewport layouts (mobile, tablet, web) since we use responsive grid classes.

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/patient/MyDoctors.tsx` | Reduce spacing, compact tables, even column distribution |
| `src/components/patient/InviteDoctorDialog.tsx` | Remove name search section, add notification insert on submit |
| `src/components/permissions/PermissionTransparencyModal.tsx` | Two-column grid layout (shared | private) |
| `src/components/doctor/DoctorAccessRequests.tsx` | Green border on invitation cards |

