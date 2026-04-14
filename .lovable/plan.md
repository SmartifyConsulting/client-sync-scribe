

# Vula Logo Sizing, Organ Donor Shading, Permission List Fixes & Doctor Info in Invite Modal

## Summary
Seven targeted changes: reduce rewards logos by 40%, increase patient banner logo by 30%, remove Organ Donor header shading, fix Private list font size to match Shared list, add "Your" prefix to shared items, remove Doctor Referrals from private list, and show selected doctor's name and avatar at the top of the Invite modal.

## Changes

### 1. Reduce Vula Vouchers logos in Doctor's My Rewards by 40%
**File:** `src/pages/doctor/DoctorRewards.tsx`
- Change logo container from `w-[40%]` to `w-[24%]` and text container from `w-[60%]` to `w-[76%]`

### 2. Increase Vula Vouchers logo in My Holarchive mobile banner by 30%
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Change `h-16` to `h-20` on the mobile banner logo

### 3. Remove Organ Donor section header shading
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Change `bg-[#F5F4F1]` to `bg-card` in both Organ Donor `CollapsibleTrigger` elements

### 4. Match font sizes across Permission Transparency lists
**File:** `src/components/permissions/PermissionTransparencyModal.tsx`
- Change both Shared and Private lists to `text-xs` to match the Holistic Health Sharing body text

### 5. Add "Your" prefix to main shared items
**File:** `src/components/permissions/PermissionTransparencyModal.tsx`
- Change labels to "Your AI Session Summaries", "Your Patient Information", "Your Patient Medical Overview", "Your Documents"

### 6. Remove "Doctor Referrals" from private items
**File:** `src/components/permissions/PermissionTransparencyModal.tsx`
- Remove the Doctor Referrals entry from `privateItems` array

### 7. Show selected doctor's name and avatar in Invite modal
**File:** `src/pages/patient/MyDoctors.tsx`
- Pass `prefillDoctorName={doctor.full_name}` and `prefillAvatarUrl={doctor.avatar_url}` to `InviteDoctorDialog`

**File:** `src/components/patient/InviteDoctorDialog.tsx`
- Add `prefillDoctorName` and `prefillAvatarUrl` props to the interface
- Above the Practice Number field, render a doctor info banner when `prefillDoctorName` is provided: show the Avatar (using the existing `Avatar`/`AvatarImage`/`AvatarFallback` components) alongside the doctor's full name
- If no avatar URL is available, show initials fallback

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/doctor/DoctorRewards.tsx` | Reduce logo container width |
| `src/components/patients/PatientDetailsEditor.tsx` | Increase banner logo; remove Organ Donor shading |
| `src/components/permissions/PermissionTransparencyModal.tsx` | Font size fix; "Your" prefix; remove Doctor Referrals |
| `src/components/patient/InviteDoctorDialog.tsx` | Accept and display doctor name + avatar |
| `src/pages/patient/MyDoctors.tsx` | Pass doctor name and avatar to InviteDoctorDialog |

