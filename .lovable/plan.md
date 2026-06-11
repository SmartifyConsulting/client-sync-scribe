## Problem

1. After phone signup, the toast still says "Check your inbox to confirm your email" — incorrect for phone users (no email is sent).
2. Nothing prevents two accounts from being created with the same phone number.
3. The "Install Holarc on your phone" card is on the Auth screen; the user wants it on the Landing hero instead.

## Fix

### 1. Conditional success toast in `src/pages/Auth.tsx`

In `handleFinalSubmit` (line 417), branch on `signupMethod`:
- `email`: keep "Check your inbox to confirm your email before signing in."
- `phone`: "Account created! You can sign in with your phone number and password."

### 2. Enforce unique phone numbers

Two layers:

**a. Database (authoritative)** — new migration:
- Add a partial unique index on `public.profiles(mobile_number)` where `mobile_number IS NOT NULL`.
- Normalize before insert: create a `BEFORE INSERT/UPDATE` trigger that strips spaces from `mobile_number` so `+27 82 123 4567` and `+27821234567` collide.
- (Synthetic-email path in `auth.users` already gives uniqueness on the phone-derived email, but profiles is the user-facing source of truth and the trigger guarantees collisions.)

**b. Client pre-check in `Auth.tsx` `createAccount`** — before calling `supabase.auth.signUp` for the phone path:
- Query `profiles` for an existing row with the same normalized `mobile_number` (compare on `e164` digits).
- If found, toast "This phone number is already registered. Sign in instead." and abort.
- Catch the unique-violation error from the DB as a fallback and show the same message.

Email path is unchanged (Supabase already enforces unique emails).

### 3. Move install prompt from Auth to Landing hero

- `src/pages/Auth.tsx`: remove both `<InstallAppPrompt />` renders (lines 959 and 1011) and the import on line 26.
- `src/pages/Landing.tsx`: import `InstallAppPrompt` and render it as a slim banner at the very top of the hero section (above the headline), full-width on mobile, max-width container on desktop. It self-hides when the app is already installed (`isStandalone()`), so installed users see nothing.

## Technical details

- Normalization helper `normalizePhone` already exists in `Auth.tsx`; reuse it for the client pre-check.
- Migration file: `ALTER TABLE public.profiles` + `CREATE UNIQUE INDEX CONCURRENTLY`-style (use plain `CREATE UNIQUE INDEX` inside a migration; concurrent isn't allowed in transactions). Index name: `profiles_mobile_number_unique_idx`.
- Trigger: `profiles_normalize_mobile_number` — `NEW.mobile_number := regexp_replace(NEW.mobile_number, '\s+', '', 'g')` when not null.
- No RLS changes needed (profiles policies unchanged).
- No changes to `InstallAppButton` itself.

## Out of scope

- No SMS OTP (phone signup remains password-based via synthetic email).
- No changes to login flow.
- No manifest or service-worker changes.
