# Add Email OTP / Magic Link to Holarc Health

Based on your answers, this is a **non-destructive** change. Existing email/password, Google sign-in, roles, RLS, dashboards, and SOS stay exactly as they are. We're just adding a new way to sign in.

## What changes

### 1. `src/hooks/useAuth.ts`
Add two helpers:
- `signInWithOtp(email)` — calls `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: \`${window.location.origin}/\` } })`. Sends a magic link + 6-digit OTP.
- `verifyOtp(email, token)` — calls `supabase.auth.verifyOtp({ email, token, type: 'email' })` for users who prefer to paste the code instead of clicking the link.

Existing `signUp`, `signIn`, `signOut`, session listener — untouched.

### 2. `src/pages/Auth.tsx`
Add a third tab next to the current Sign In / Sign Up tabs: **"Email code"**.
- Step 1: email input → "Send code" button → calls `signInWithOtp`.
- Step 2: 6-digit `InputOTP` (already in the project) + "Verify" button → calls `verifyOtp`. Also shows "Or click the link we emailed you".
- Resend cooldown (30s).
- Loading + error toasts, matching the existing Auth page styling.

No "forgot password" / show-password rules apply here (no password field on this tab). Existing password tabs keep their eye-toggle and forgot-password link as required by the project's auth UX rules.

### 3. Existing-user migration
Nothing to do. Existing users (with passwords + Google) can immediately use OTP on the same email — Supabase links it to the same `auth.users` row. Their `profiles`, `user_roles`, patient records, subscriptions, etc. all continue to work because they're keyed off `auth.users.id`, which doesn't change.

First-OTP-login users still hit the existing `handle_new_user` trigger → profile created → existing role-resolution logic in `useUserRole` routes them to the right dashboard. The current onboarding flow (subscription gate, role assignment via admin / signup metadata) remains the source of truth.

### 4. Email delivery
Supabase will send the OTP email using the project's existing auth email setup. No new edge function, no new template scaffold required for MVP. We can brand the magic-link / OTP email later via `scaffold_auth_email_templates` if you want custom styling — out of scope for this task.

## What is explicitly NOT changing
- No DB migration (no new `profiles` columns, no role enum changes).
- No RLS changes.
- No removal of password auth or Google OAuth.
- No new role categories — `useUserRole` continues to map existing roles (doctor, patient, admin, hospital_staff, ambulance_staff, blood_bank) to dashboards as today.
- No changes to dashboards, SOS flow, HolarcHelp module, or edge functions.
- No removal of Resend (still used for transactional emails like invoices, invitations, reminders).

## Files touched
- `src/hooks/useAuth.ts` — add two methods
- `src/pages/Auth.tsx` — add "Email code" tab UI

## Out of scope (can be follow-ups)
- Custom-branded auth email templates
- Phone/SMS OTP
- Removing password auth
- Refactoring roles to the 3-category model
