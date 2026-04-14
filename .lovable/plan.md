

# Patient Layout, Sub-tabs, Greeting, Vula Count, Permission Headings, Doctor Badge, Green Border & Side-by-Side Doctor Numbers

## Summary
Nine changes: add sidebar nav for patient tablet view, make sub-tab headings black, move Vula count to patient name row on web, use doctor-style greeting, match Private heading format to Shared heading, show doctor specialty badge in invite modal, green border on doctor banner, and display Practice Number and Registration Number side by side on web and tablet views.

## Changes

### 1. Add sidebar navigation for patient on tablet/web (md+)
**File:** `src/components/layout/PatientAppLayout.tsx`
- Import and render `Sidebar` on `md:` screens (matching `AppLayout`)
- Add `md:ml-[210px]` to the main content area

### 2. Make sub-tab headings black font colour
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Add `text-foreground` to all sub-tab `TabsTrigger` elements

### 3. Move Vula Vouchers count to same row as patient name (web view)
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Restructure `ProfileBanner` so on `md:` the Vula count appears inline right of patient name

### 4. Use doctor-style time-based greeting for patient
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Replace "Welcome back," with "Good morning/afternoon/evening, {name}" and date subtitle

### 5. Make "Private — Not Shared" heading match "Shared with Care Team" format
**File:** `src/components/permissions/PermissionTransparencyModal.tsx`
- Change Private heading from `text-muted-foreground` to `text-foreground`

### 6. Show doctor specialty badge under name in invite modal
**File:** `src/components/patient/InviteDoctorDialog.tsx`
- Add `prefillSpecialty?: string` prop; render `<Badge variant="secondary">` with specialty

**File:** `src/pages/patient/MyDoctors.tsx`
- Pass `prefillSpecialty={doctor.specialty}` to `InviteDoctorDialog`

### 7. Green border on doctor info banner in invite modal
**File:** `src/components/patient/InviteDoctorDialog.tsx`
- Change `border-border bg-muted/30` to `border-green-500 bg-green-50/30`

### 8. Practice Number and Registration Number side by side on web/tablet
**File:** `src/components/patient/InviteDoctorDialog.tsx`
- Wrap the two input fields in a `grid grid-cols-1 md:grid-cols-2 gap-4` container so they sit side by side on tablet and web, stacked on mobile

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/PatientAppLayout.tsx` | Add Sidebar for md+ screens |
| `src/components/patients/PatientDetailsEditor.tsx` | Black sub-tabs; Vula count on name row; doctor-style greeting |
| `src/components/permissions/PermissionTransparencyModal.tsx` | Private heading matches Shared heading format |
| `src/components/patient/InviteDoctorDialog.tsx` | Specialty badge; green border; side-by-side number fields |
| `src/pages/patient/MyDoctors.tsx` | Pass specialty to InviteDoctorDialog |

