## Fix the two auth errors

Both errors come from Supabase Auth configuration, not from app code:

1. **"Phone logins are disabled"** — the phone provider is turned off on the backend, so `signInWithPassword({ phone, password })` is rejected before it reaches our code.
2. **"Signups not allowed for this instance"** — `disable_signup` is currently `true` on the backend, so every `signUp()` call fails regardless of role/email/phone.

### What I will do

1. **Enable signups** on the backend via `configure_auth` (`disable_signup: false`), keeping HIBP leaked-password protection on and auto-confirm off.
2. **Enable the Phone provider** for password sign-in. Since you've told me you're bypassing SMS, I'll enable phone auth **without** an SMS provider — users authenticate with phone + password only, no OTP. (Phone numbers will not be "verified" via SMS, which is acceptable given the bypass.)
3. **Verify in the preview** by retrying both the phone sign-in and the signup flow and confirming the toast errors are gone.

### Out of scope
- No changes to `Auth.tsx`, MFA screens, or the tour. The frontend code is already correct; only backend auth settings need to change.
- No SMS provider wiring (Twilio/MessageBird/etc.) — explicitly bypassed per your earlier instruction.
