

# Doctor Profile Switcher, Admin Nav Tab, and Practice Cleanup

## Summary
Add a doctor/patient profile switcher in the avatar popover, replace the "Profile" bottom nav item with "Admin" (housing Pricing, Invoices, Templates), remove those tabs from My Practice, and route the doctor's patient view through the existing patient layout.

## Changes

### 1. Avatar popover: Add profile switcher
**File:** `src/components/layout/TopBarIcons.tsx`
- Below the current name/role display (lines 161-164), add a second clickable row showing the same username with "Patient" label underneath
- Clicking it navigates to `/patient/details` (the patient view)
- Also add a "Doctor" row so the user can switch back — highlight the currently active profile
- Use `useLocation` to detect if currently on a patient route (`/patient/*`) to highlight accordingly

**File:** `src/components/layout/PatientAppLayout.tsx`
- Same change in the patient layout's avatar popover (lines 216-227): add a "Doctor" switcher row that navigates to `/dashboard`

### 2. Bottom nav: Replace "Profile" with "Admin"
**File:** `src/components/layout/BottomNav.tsx`
- Replace `{ icon: User, label: "Profile", to: "/profile" }` with `{ icon: Shield (or ShieldCheck), label: "Admin", to: "/admin" }`
- Import `Shield` from lucide-react, remove `User` if unused
- Create a new route for `/admin` that renders a new Admin page

### 3. Create Admin page with Pricing, Invoices, Templates tabs
**File:** `src/pages/Admin.tsx` (new)
- Simple page with Tabs: Pricing, Invoices, Templates
- Reuse existing components: `PricingAdmin` content (or inline), `DoctorInvoices`, and the Templates tab content currently in MyPractice
- Match the tab styling from MyPractice (primary bg tabs)

### 4. Remove Pricing, Invoices, Templates from My Practice
**File:** `src/pages/MyPractice.tsx`
- Remove the three `TabsTrigger` entries for "Pricing", "Invoices", "Templates" (lines 1047-1065)
- Remove their corresponding `TabsContent` blocks
- Remove unused imports (`DoctorInvoices`, etc.) if they become orphaned
- Keep My Practice, Referrals, and Certificates tabs

### 5. Route setup
**File:** `src/App.tsx`
- Add route `<Route path="/admin" element={<Admin />} />` inside the doctor protected layout
- Import the new Admin page
- Ensure `/patient/details` is accessible to doctors too (it currently lives under PatientAppLayout — may need to add it under AppLayout as well, or allow doctors to access the PatientAppLayout routes)

### 6. Doctor accessing patient view
- When a doctor clicks the "Patient" profile in the avatar, navigate to `/patient/details`
- Since patient routes use `PatientAppLayout`, the doctor will see the full patient experience including the patient bottom nav
- The `useUserRole` hook returns the DB role (always "doctor"), so we need a client-side "viewing as" state. Add a `viewingAs` context or simply allow doctors to access patient routes by not guarding them by role.
- In `App.tsx`, ensure the patient routes under `PatientAppLayout` don't block doctors — currently they're just wrapped in `ProtectedRoute` (auth only), so doctors can already access them.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/TopBarIcons.tsx` | Add doctor/patient profile switcher rows in avatar popover |
| `src/components/layout/PatientAppLayout.tsx` | Add doctor switcher row in avatar popover |
| `src/components/layout/BottomNav.tsx` | Replace "Profile" with "Admin" |
| `src/pages/Admin.tsx` | New page with Pricing, Invoices, Templates tabs |
| `src/pages/MyPractice.tsx` | Remove Pricing, Invoices, Templates tabs |
| `src/App.tsx` | Add `/admin` route |

