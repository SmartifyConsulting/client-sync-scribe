

# Fix: Auto-Generated Tasks Not Working After Session Completion

## Root Cause

The `process-todo-actions` edge function is **not listed in `supabase/config.toml`**. Without an entry, the function may not be deployed or may have default JWT verification that silently fails. Additionally, `summarize-session` has outdated CORS headers missing the newer Supabase client headers.

The flow is: `completeSession` → calls `summarize-session` → gets `action_points` → calls `process-todo-actions`. The second call never fires (zero logs for `process-todo-actions`).

## Fix

### 1. Add `process-todo-actions` to config.toml

Add the missing entry. The function already validates auth internally, so set `verify_jwt = false` to match other similar functions:

```toml
[functions.process-todo-actions]
verify_jwt = false
```

Also add other missing functions that exist in the codebase:
- `admin-reset-passwords`
- `remind-audio-retention`
- `validate-medication-video`

### 2. Update CORS headers in `summarize-session`

The current CORS headers are missing the newer Supabase client headers. Update to match the standard pattern used in `process-todo-actions`:

```
"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

### 3. Add logging in `useSessions.ts` for better debugging

Add a `console.log` before calling `process-todo-actions` to confirm `action_points` is populated and the call is being made. Also log `summaryData` structure to verify the response.

### 4. Deploy and verify

After changes, test the `process-todo-actions` function to confirm it boots and responds correctly.

## Files Modified

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `process-todo-actions` (and other missing functions) |
| `supabase/functions/summarize-session/index.ts` | Update CORS headers |
| `src/hooks/useSessions.ts` | Add diagnostic logging around action_points check |

