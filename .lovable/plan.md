

# Sidebar Rename, Permission Lists, Patient Name Fix, Section Headers, Vula Logo Updates & Rewards Logo Sizing

## Summary
Seven groups of changes: rename "Dashboard" to "Home" in sidebar, simplify Permission Transparency to plain bullet lists, fix "Unknown Patient" on doctor invitation cards, standardize section headers app-wide, replace Vula symbol with uploaded logo on dashboard card, increase patient banner logo by 60%, and make Doctor/Patient Vulas cards use horizontal Vula Vouchers logo at 40% card width.

## Changes

### 1. Rename "Dashboard" to "Home" in sidebar
**File:** `src/components/layout/Sidebar.tsx`
- Change `label: "Dashboard"` to `label: "Home"` in all three nav arrays

### 2. Simplify Permission Transparency to plain bullet lists
**File:** `src/components/permissions/PermissionTransparencyModal.tsx`
- Replace framed card-style items with simple `<ul>` bulleted lists
- Remove icons, borders, colored backgrounds from individual items
- Keep section headings; use consistent `text-sm` font

### 3. Fix "Unknown Patient" on doctor invitation cards
**Database migration:** Add `patient_name` text column (nullable) to `doctor_access_requests`

**File:** `src/components/patient/InviteDoctorDialog.tsx` — Store `patient_name` when inserting request; add notification for doctor

**File:** `src/components/doctor/DoctorAccessRequests.tsx` — Display `request.patient_name` as primary, green border on cards

### 4. Standardize section headers to MyPractice accordion style
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Update `SectionHeader` component: `bg-card` with `text-primary` icons
- Update inline Organ Donor triggers to match

### 5. Replace Vula symbol with uploaded VulaLogo-3.png on dashboard card
- Copy uploaded `VulaLogo-3.png` to `src/assets/vula-vouchers-logo-v3.png`
- **File:** `src/pages/Dashboard.tsx` — Import and use `vula-vouchers-logo-v3.png` as `imageUrl` on StatsCard

### 6. Increase horizontal Vula Vouchers logo in patient profile banner by 60%
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Change `h-10` to `h-16` on the mobile banner Vula Vouchers logo

### 7. Use horizontal Vula Vouchers logo at 40% width in Doctor Vulas & Patient Vulas cards
**File:** `src/pages/doctor/DoctorRewards.tsx`
- In the Doctor Vulas card (line 131) and Patient Vulas card (line 137): replace the small inline `h-5` logo with a layout where the horizontal logo occupies 40% of the card width
- Change each card's `CardContent` to a flex row: left side (60%) shows label + count, right side (40%) shows the horizontal `vulaVouchersLogo` with `w-full h-auto object-contain`
- Apply same treatment in the patient rewards page

**File:** `src/pages/patient/MyRewards.tsx`
- Apply matching 40% logo width layout to any Doctor/Patient Vulas balance cards

## Technical Detail
For the 40% logo layout, each balance card becomes:
```
<div className="flex items-center">
  <div className="w-[60%]">
    <p className="text-xs text-muted-foreground">Doctor Vulas</p>
    <p className="text-2xl font-bold">{doctorVulas}</p>
  </div>
  <div className="w-[40%] flex items-center justify-center">
    <img src={vulaVouchersLogo} className="w-full h-auto object-contain" />
  </div>
</div>
```

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/Sidebar.tsx` | Rename "Dashboard" → "Home" |
| `src/components/permissions/PermissionTransparencyModal.tsx` | Plain bullet lists |
| `src/components/patient/InviteDoctorDialog.tsx` | Store patient_name, add notification |
| `src/components/doctor/DoctorAccessRequests.tsx` | Use stored patient_name, green border |
| `src/components/patients/PatientDetailsEditor.tsx` | Standardize SectionHeader; increase banner logo to h-16 |
| `src/pages/Dashboard.tsx` | Replace vula-symbol with uploaded VulaLogo-3.png |
| `src/pages/doctor/DoctorRewards.tsx` | Horizontal logo at 40% width in balance cards |
| `src/pages/patient/MyRewards.tsx` | Matching 40% logo layout |
| `src/assets/vula-vouchers-logo-v3.png` | New asset (copied from upload) |
| DB migration | Add `patient_name` to `doctor_access_requests` |

