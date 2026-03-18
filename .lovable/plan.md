

# Fix Logo Size, Practice Number Persistence, and Partner Pending Status

## 1. Increase Logo Size by 130%

Scale all logo instances by 130%:

| Location | Current | New (130%) |
|---|---|---|
| Sidebar | h-10 (40px) | h-[52px] |
| Mobile Header | h-8 (32px) | h-[42px] |
| Auth page | h-12 (48px) | h-[62px] |
| Forgot/Reset Password | h-12 (48px) | h-[62px] |
| Landing page | h-10 (40px) | h-[52px] |

**Files:** `Sidebar.tsx`, `MobileHeader.tsx`, `Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `Landing.tsx`

## 2. Fix Practice Number Not Persisting

**Root Cause:** The autosave `useEffect` depends on `[formData]`. When the profile loads and sets formData via `isSettingFromProfile`, a 100ms timeout resets the flag. However, React batching can cause the autosave effect to fire during this window with the initial (empty) form data, sending an empty `practice_number` back to the database.

**Fix in `src/pages/Profile.tsx`:**
- Instead of using a 100ms `setTimeout` to reset the `isSettingFromProfile` flag, use a more robust approach: track the previous profile data and skip autosave when formData hasn't actually changed from the profile-loaded values
- Add a `profileLoadedData` ref that stores the formData snapshot when profile loads
- In the autosave effect, compare current formData against `profileLoadedData` -- only save if values actually differ
- This prevents the race condition where autosave fires with stale/initial data

## 3. Make Partner Email Required and Create Pending Users

**Problem:** The `practice_partners` table has no `email` column, so when partners are added without entering an email, no invitation or pending user is ever created.

**Fix:**
- Add an `email` column to the `practice_partners` table via migration
- Make the email field visually required in the "Add New Partner" form (it already exists in the UI but is optional)
- Ensure the `addPartner` function validates email is provided before saving
- When a partner is added with an email, the existing flow already calls `send-user-invitation` with `isPracticePartner: true`, which creates the pending user record

**Database Migration:**
- `ALTER TABLE practice_partners ADD COLUMN email text;`

**Changes in `src/pages/Profile.tsx`:**
- Make email field required in validation (alongside name and registration number)
- Show validation error if email is missing

## Technical Summary

### Database Migration
- Add `email text` column to `practice_partners` table

### Files Modified
- `src/components/layout/Sidebar.tsx` -- logo h-10 to h-[52px]
- `src/components/layout/MobileHeader.tsx` -- logo h-8 to h-[42px]
- `src/pages/Auth.tsx` -- logo h-12 to h-[62px]
- `src/pages/ForgotPassword.tsx` -- logo h-12 to h-[62px]
- `src/pages/ResetPassword.tsx` -- logo h-12 to h-[62px]
- `src/pages/Landing.tsx` -- logo h-10 to h-[52px]
- `src/pages/Profile.tsx` -- fix autosave race condition, make partner email required

