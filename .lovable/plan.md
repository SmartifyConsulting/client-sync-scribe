## Why the error happens

Supabase Auth has **Leaked Password Protection** enabled. On signup it hashes the password and checks the prefix against the Have I Been Pwned (HIBP) breached-password corpus. `Stargirl1$` meets all local strength rules (length, mixed case, number, symbol — hence "Excellent") but it exists in known breaches, so Supabase returns:

> Password is known to be weak and easy to guess, please choose a different one.

This is not a bug — it's the security control working. The fix is UX, not disabling the check.

## Changes

### 1. `src/pages/Auth.tsx` (signup form)
- Detect the HIBP error from Supabase (`error.code === "weak_password"` or message contains "known to be weak") and show a friendlier, more actionable toast/inline message:
  > "This password has appeared in a known data breach. Even though it looks strong, it's unsafe to reuse. Please choose a unique password you haven't used elsewhere."
- Keep the red banner, but also highlight the Password field (red border + helper text) so the user knows exactly which field to change, instead of scrolling back up.
- Auto-focus the password field and clear it on this specific error.

### 2. Password strength helper (same file / strength component)
- Add a 5th checklist row under the strength meter: **"Not found in known data breaches"** — neutral by default, ✓ after a successful submit attempt, ✗ red after an HIBP rejection. (Purely client-side state flip from the server error — we do not call HIBP ourselves.)
- Add a one-line hint under the meter: *"Tip: avoid names, dictionary words, and passwords you've used on other sites — even with numbers/symbols added."*

### 3. No backend changes
- Leave `password_hibp_enabled: true`. Do **not** disable the check.
- No DB migration, no edge function changes.

## Out of scope
- Not changing Supabase auth settings.
- Not adding a custom HIBP pre-check (Supabase already does it server-side; duplicating client-side wastes a round-trip).
- Not touching other pages (ResetPassword already uses `updateUser` which will surface the same error — happy to mirror the UX there in a follow-up if you want).
