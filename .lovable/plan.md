

# Fix Login Flash & Remove Logo Shadow

## Summary
Fix the issue where logging in as a patient briefly shows the doctor Dashboard before redirecting, and remove the drop shadow from the hero logo on the landing page.

## Problem Analysis

**Login flash issue**: After login, `Auth.tsx` always navigates to `/dashboard` (line 469). The `RoleBasedDashboard` component then fetches the user's role via `useUserRole()`, and while loading, briefly renders the doctor `Dashboard` component (it only redirects patients after the role loads). This causes a flash of the doctor dashboard (which shows "Paula Smart" data from cached/previous queries).

**Fix**: Make `RoleBasedDashboard` show a loading spinner until the role is determined, and also have the Auth login handler check the role first and navigate directly to the correct route.

**Logo shadow**: The hero logo on Landing.tsx (line 148) has `drop-shadow-lg` class.

## Changes

### 1. Fix login redirect — navigate to correct route by role
**File:** `src/pages/Auth.tsx`
- In `handleLogin` (line 469): After successful sign-in, query the `user_roles` table for the logged-in user's role before navigating
- If role is `patient`, navigate to `/patient/details` directly
- If role is `doctor` or `admin`, navigate to `/dashboard`
- This eliminates the flash entirely since the correct page loads immediately

### 2. Fix RoleBasedDashboard flash
**File:** `src/App.tsx`
- In `RoleBasedDashboard`, the loading state already shows a spinner (lines 82-87), but on first render `loading` might briefly be `false` with stale role. Ensure the spinner shows until role is definitively loaded for the current user.

### 3. Remove logo shadow on landing page
**File:** `src/pages/Landing.tsx`
- Line 148: Remove `drop-shadow-lg` from the hero logo's className
- Change from `"h-32 sm:h-40 w-auto mx-auto drop-shadow-lg"` to `"h-32 sm:h-40 w-auto mx-auto"`

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Check user role after login and navigate to correct route |
| `src/App.tsx` | Ensure RoleBasedDashboard doesn't flash doctor content |
| `src/pages/Landing.tsx` | Remove `drop-shadow-lg` from hero logo |

