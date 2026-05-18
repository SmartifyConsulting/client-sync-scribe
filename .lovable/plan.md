## Disable public sign-up for MVP

Lock down account creation so only admins can grant access via the backend.

### Changes

1. **`src/pages/Auth.tsx`**
   - Disable the "Create Account" submit button on the sign-up tab and show an inline notice: *"Sign-ups are currently invite-only. Please contact an administrator for access."*
   - Optionally hide the "Sign Up" tab trigger entirely and default to the Sign In tab, so the UI clearly signals login-only.

2. **`src/pages/ProviderSignup.tsx`** (Emergency Service Provider sign-up)
   - Same treatment: disable the "Create account" button and show the invite-only notice.
   - Hide/disable any links pointing here from `/auth`.

3. **Server-side enforcement** via `supabase--configure_auth`
   - Set `disable_signup: true` so even a direct API call to `auth/signup` is rejected. This is the real gate — UI changes alone can be bypassed.
   - Keep existing settings otherwise (no auto-confirm change, anonymous users stay off).

### Out of scope
- No changes to login, password reset, or existing user flows.
- No changes to the admin seed/invite path (admins continue to create users via the backend tool you already have).
- Trial messaging removal stays as-is.

### How to re-enable later
Flip `disable_signup` back to `false` and remove the disabled state + notice from the two signup pages.