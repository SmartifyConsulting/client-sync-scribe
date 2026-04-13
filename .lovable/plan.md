

# Fix Reset Password Race Condition

## Root Cause

Two bugs in `ResetPassword.tsx`:

1. **Stale closure in timeout**: Line 48 checks `!authReady`, but `authReady` is captured from the initial render closure — it's always `false`. So even if `setAuthReady(true)` was called via `getSession()`, the timeout still sees `false`.

2. **Missing ref update in getSession fallback**: The `getSession()` path (line 39-44) sets `authReady` state but does NOT set `recoveryVerifiedRef.current = true`. Since the timeout only reliably checks the ref (due to bug #1), the 5-second timeout always fires and redirects to `/forgot-password`.

Combined effect: Recovery token gets processed, session exists, but the timeout fires anyway and kicks the user back to forgot-password.

## Fix

**File:** `src/pages/ResetPassword.tsx`

Two small changes:

1. In the `getSession()` fallback (line 40-43), also set `recoveryVerifiedRef.current = true` so the timeout won't fire.

2. Remove the `!authReady` check from the timeout condition (line 48) since it's always stale. Only rely on `recoveryVerifiedRef.current`.

```typescript
// Line 39-44: Add ref update
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    recoveryVerifiedRef.current = true;  // <-- add this
    setAuthReady(true);
    setInitialLoading(false);
  }
});

// Line 47-57: Only check the ref (remove stale authReady)
timeoutId = setTimeout(() => {
  if (!recoveryVerifiedRef.current) {  // <-- remove && !authReady
    setInitialLoading(false);
    toast({ ... });
    navigate("/forgot-password");
  }
}, 5000);
```

No other files need changes.

