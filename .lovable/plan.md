## Problem

Paraskevi's account was created during the earlier test signup, before the new "minimal patient row on signup" code shipped. Result: her `auth.users` row exists, but no `patients` row was ever inserted. When she logs in, `MyDetails` finds nothing and falls back to a "no record" message — and because the editor never renders, the new `ProfileCompletionBanner` doesn't show either.

This will keep happening for any historical user whose signup pre-dated the minimal-insert change, and for any future signup where the insert silently fails (network blip, RLS edge case).

## Fix (frontend only, narrowly scoped to MyDetails)

In `src/pages/patient/MyDetails.tsx`:

1. **Self-heal in `fetchPatientRecord`**: when the `patients` lookup returns no row for the logged-in user, immediately insert a minimal patient record (`patient_user_id = user.id`, `user_id = user.id`, `name = profile full_name || email-prefix`, `email = user.email`) and re-select it into state. Same shape as the signup-time insert in `Auth.tsx` so behaviour is identical.

2. **Remove the "Your medical record is being set up" fallback** — after self-heal it's unreachable. Keep a single error toast if the auto-insert itself fails (e.g. RLS denies it), so we don't loop silently.

3. **Fix the Hook-order bug**: `useMemo(isIncomplete)` currently runs *after* the `if (loading) return …` early return, which violates Rules of Hooks. Move the `useMemo` above the loading guard.

4. **Banner visibility**: with the editor always rendering, `ProfileCompletionBanner` will appear above it on first login (all completion fields empty → `isIncomplete = true`).

## Out of scope

- No DB schema changes, no RLS changes, no `Auth.tsx` changes (signup insert already correct for new users).
- No doctor/provider screens — same self-heal pattern can be added to their dashboards in a follow-up if desired.
- No backfill migration for other historical users; the self-heal handles them on next login.

## Files

- `src/pages/patient/MyDetails.tsx` — only file changed.
