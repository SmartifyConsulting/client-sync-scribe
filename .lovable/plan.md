

# Plan: Heading Consistency, Moola Icon Size, Button Rename, and Share App Feature

## Changes

### 1. Fix "My Doctors" heading to match "My Round Table"
**File: `src/components/patients/PatientDetailsEditor.tsx`**

The "My Round Table" tab (line 569-571) wraps content with an h2 heading + description, but "My Doctors" tab (line 558-563) does not. Add the same heading wrapper around the MyDoctors component:
```tsx
<div className="mb-4">
  <h2 className="text-lg font-semibold text-foreground">My Doctors</h2>
  <p className="text-xs text-muted-foreground">Healthcare providers with access to your profile</p>
</div>
```
Pass `hideHeader` to `<MyDoctors hideHeader />` (it already accepts this prop).

### 2. Increase Moola symbol size on Dashboard StatsCard
**File: `src/components/dashboard/StatsCard.tsx`**

Currently when `iconSize="large"` and `imageUrl` is set, the image renders at `h-9 w-9`. The Star icon (default size) renders at `h-7 w-7`. To make the Moola symbol match the Star icon's visual prominence, increase the large image size to `h-11 w-11`.

### 3. Rename "Add Patient" button to "Add New Patient"
**File: `src/pages/Patients.tsx`**
- Line 394: Change button text from "Add Patient" to "Add New Patient"
- Line 656: Change submit button text from "Add Patient" to "Add New Patient"

### 4. Add "Share App" button
**File: `src/pages/Patients.tsx`**
Add a "Share App" button next to "Add New Patient" that opens a dialog to send an app invitation email. This is distinct from adding a patient — the recipient gets an invite to join Holarc but is NOT automatically added as the doctor's patient.

**File: `src/components/patients/PatientDetailsEditor.tsx`**
Add a "Share App" button on individual patient profiles (in the header area, next to the Edit button) — only visible to doctors viewing patient profiles.

**New component: `src/components/ShareAppDialog.tsx`**
A reusable dialog that:
- Accepts an optional email pre-fill
- Sends an invitation via the existing `send-user-invitation` edge function
- On acceptance by the recipient, awards Moolas to the sender

**Database: Migration needed**
Add a `referral_source_user_id` column to `user_invitations` table (or use the existing `sender_id`) to track who referred the user. When the invitation is accepted, award Moolas to the referrer via a new entry in `doctor_rewards` with `reward_type: "app_referral"`.

**Edge function update: `supabase/functions/send-user-invitation/index.ts`**
Ensure it supports a `referral` invitation type that doesn't create doctor-patient relationships on acceptance — only awards Moolas.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Add h2 heading for My Doctors tab; add Share App button on patient profiles |
| `src/components/dashboard/StatsCard.tsx` | Increase large imageUrl size from h-9 w-9 to h-11 w-11 |
| `src/pages/Patients.tsx` | Rename button text; add Share App button |
| `src/components/ShareAppDialog.tsx` | New reusable Share App invitation dialog |
| `supabase/functions/send-user-invitation/index.ts` | Support referral invitation type |

