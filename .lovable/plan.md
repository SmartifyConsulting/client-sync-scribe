## Goal
Make the Sign In screen clearer so users aren't confused about whether to enter an email or a phone number.

## Problem today
- One combined "Email or Phone Number" field with placeholder `you@example.com or 82 123 4567`.
- Country code selector appears/disappears based on whether the field contains `@`.
- A small helper line ("Will sign in as +27…") only shows for phone.
- A separate "Email me a sign-in code instead" link adds a third pathway, making the choice feel cluttered.

## Proposed change (UI only, `src/pages/Auth.tsx`, sign-in view only)

1. **Add a simple 2-tab switch** at the top of the sign-in card: **Email** | **Phone**. Default = Email. Use the existing tab/segmented style already used elsewhere (teal active, muted inactive) for visual consistency.

2. **Email tab** — single email field (icon + `you@example.com`) + password + Sign In. No country selector. No phone helper text.

3. **Phone tab** — country selector (flag + code) + phone number field (`82 123 4567`) + password + Sign In. Show the normalized-number helper ("You'll sign in as +27 82 123 4567") under the field only on this tab.

4. **Internally** keep using the existing `loginId` state — when the user types in the Email tab we store the raw email; in the Phone tab we store the raw digits and prepend the country code on submit. `handleLogin` logic stays the same (it already branches on `@`).

5. **Demote the magic-link option.** Move "Email me a sign-in code instead" into a smaller secondary link under the Sign In button (same place, but smaller and labelled "Prefer a one-time code? Email it to me"). Still toggles `useOtp` exactly like today. No change to the OTP form.

6. Keep everything else as-is: trust band, Forgot password link (still `tabIndex={-1}`), show/hide password toggle, Google/Dev buttons, "Don't have an account? Sign up".

## Out of scope
- No backend, auth, or routing changes.
- No changes to the sign-up flow, password reset, MFA, or OTP verification UI.
- No new dependencies.

## Files touched
- `src/pages/Auth.tsx` — sign-in render block only (≈ lines 855-1000).
