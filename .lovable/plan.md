

# Fix Reset Password Race Condition & Harden Recovery Flow

## Problem

When a user clicks the password reset link, they land on `/reset-password` with a hash fragment containing the recovery token. Supabase's `onAuthStateChange` processes this token asynchronously, but `ResetPassword.tsx` immediately calls `getSession()` — which returns `null` because the token hasn't been exchanged yet. This causes a premature "Invalid or expired link" toast and redirect to `/forgot-password`.

There is no conflicting recovery logic in `Auth.tsx` — the entire reset flow lives in `ResetPassword.tsx`. The fix is contained there.

## Changes

### 1. Rewrite `ResetPassword.tsx` with proper recovery detection

**File:** `src/pages/ResetPassword.tsx`

- Add three local states: `authReady` (boolean, starts false), `recoveryVerified` (boolean), `initialLoading` (boolean, starts true)
- Replace the `useEffect` with one that:
  1. Subscribes to `onAuthStateChange` **first**
  2. Listens for `PASSWORD_RECOVERY` event — when received, sets `recoveryVerified = true` and `authReady = true`
  3. Also listens for `SIGNED_IN` event as a fallback (some Supabase versions emit this instead)
  4. After subscribing, calls `getSession()` as a fallback — if a session exists, sets `authReady = true` (recovery may have already been processed)
  5. Adds a 5-second timeout as a safety net: if neither event fires nor session found, show the "expired link" error and redirect
  6. Cleans up the subscription on unmount
- Show a loading spinner while `initialLoading` is true (auth not yet ready)
- Disable the submit button until `authReady` is true
- `handleSubmit` calls `updateUser({ password })` only when `authReady` is true
- After successful password update, clean up the URL hash with `window.history.replaceState` to prevent re-triggering
- After success, check user role and redirect to the correct page (patient vs doctor)

### 2. No changes needed in Auth.tsx

Auth.tsx has no recovery handling — it only handles login and signup. The user's mention of Auth.tsx race conditions refers to a flow that doesn't exist there. All fixes are in ResetPassword.tsx.

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/ResetPassword.tsx` | Replace session-check with `onAuthStateChange` listener for `PASSWORD_RECOVERY`, add loading state, timeout fallback, URL cleanup after success |

