

# Patient Menu Fix, Vula Reduction, Round Table from Home, Password Link, Patient Avatar, Notifications

## Summary
Six fixes: route patient to correct layout, reduce Vula logo sizes by 20%, let doctors start round table chats from the dashboard, move "Forgot password" inline with password label, show patient avatar on invitation cards, and create notifications when invited/accepted.

## Changes

### 1. Fix patient seeing doctor menu
**Root cause:** When a patient logs in and hits `/dashboard`, the `RoleBasedDashboard` component redirects to `/patient/details`, but `/dashboard` is wrapped in `AppLayout` (doctor layout). During the redirect, the doctor sidebar/bottom nav briefly renders. More critically, if the redirect fails or is slow, the patient sees the full doctor dashboard.

**Fix in `src/App.tsx`:**
- Move `/dashboard` out of the `AppLayout` route group
- Create a standalone `RoleBasedRedirect` component that checks the role and immediately redirects: patients to `/patient/details` (under `PatientAppLayout`), doctors stay in `AppLayout`

**Fix in `src/components/layout/BottomNav.tsx`:**
- Add early return `null` on `md:` screens (it's already hidden via CSS but the nav items logic runs for all breakpoints)
- Ensure `loading` state from `useUserRole` is checked before rendering doctor nav items

### 2. Reduce Vula voucher logos by 20% across all layouts
**Files:** `src/components/patients/PatientDetailsEditor.tsx`, `src/pages/doctor/DoctorRewards.tsx`, `src/pages/patient/MyRewards.tsx`

Current sizes and new sizes (20% reduction):
- `PatientDetailsEditor.tsx`: `h-14` → `h-11`, `h-20` → `h-16` (mobile banner logo)
- `DoctorRewards.tsx`: `w-[24%]` → `w-[19%]`, `h-9 w-9` → `h-7 w-7`, `h-12 w-12` → `h-10 w-10`
- `MyRewards.tsx`: `h-7 w-7` → `h-6 w-6` (mobile), `h-10 w-10` → `h-8 w-8` (desktop)
- All inline `h-4`/`h-5` instances → `h-3`/`h-4`

### 3. Start round table chat from doctor home screen
**File:** `src/pages/Dashboard.tsx`

Add a "Start Round Table" section below the DoctorAccessRequests card:
- Render a patient name search/select dropdown (using existing patients list query)
- On selecting a patient, navigate to `/patients/:id` with a query param `?tab=roundtable` to open the round table view directly

### 4. Move "Forgot your password?" to same line as Password label
**File:** `src/pages/Auth.tsx`

Currently "Forgot your password?" is in a centered `div` below the form. Move it inline with the Password label:
```
<div className="flex items-center justify-between">
  <Label htmlFor="password">Password</Label>
  <button onClick={...} className="text-xs text-muted-foreground hover:text-primary hover:underline">
    Forgot your password?
  </button>
</div>
```
Remove the old standalone "Forgot your password?" div below the form.

### 5. Show patient profile picture on invitation cards
**File:** `src/components/doctor/DoctorAccessRequests.tsx`

Currently the card shows initials in a plain div. Fix:
- Fetch `avatar_url` alongside `full_name` in the profile query (line 94): `.select("full_name, avatar_url")`
- Replace the initials `div` with an `Avatar` component showing the patient's profile picture with initials fallback
- Update the `AccessRequest` interface to include `avatar_url` in `patient_profile`

### 6. Create notifications when invited and when accepted
**File:** `src/components/patient/InviteDoctorDialog.tsx`
- Already creates a notification for the doctor when invited (lines 102-122) — this works.

**File:** `src/components/doctor/DoctorAccessRequests.tsx`
- After accepting a request (around line 182), insert a notification for the patient:
```ts
await supabase.from("notifications").insert({
  user_id: acceptingRequest.patient_user_id,
  type: "access_accepted",
  title: "Invitation Accepted",
  description: `Dr. ${profile?.full_name || "Your doctor"} has accepted your invitation.`,
  is_read: false,
});
```
- After declining, insert a notification for the patient as well.

## Files Modified

| File | Changes |
|------|---------|
| `src/App.tsx` | Standalone role-based redirect for `/dashboard` |
| `src/components/layout/BottomNav.tsx` | Guard against loading state |
| `src/components/patients/PatientDetailsEditor.tsx` | Reduce Vula logo sizes by 20% |
| `src/pages/doctor/DoctorRewards.tsx` | Reduce Vula logo sizes by 20% |
| `src/pages/patient/MyRewards.tsx` | Reduce Vula logo sizes by 20% |
| `src/pages/Dashboard.tsx` | Add "Start Round Table" patient selector |
| `src/pages/Auth.tsx` | Move "Forgot password" inline with Password label |
| `src/components/doctor/DoctorAccessRequests.tsx` | Show patient avatar; add acceptance/decline notifications |

