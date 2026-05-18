## Goal

During MVP testing, signup should not surface any "trial period" / "you'll need to start paying" messaging. No toast, no banner, no modal, no subscription row that flags the user as being on a countdown.

## Current state

- `src/pages/Auth.tsx` (lines ~374–386) inserts a `subscriptions` row at signup with `status: "free_period"`, `is_trial: true`, and `trial_ends_at = now + 30 days`. This is the source that feeds the trial-countdown logic.
- `src/hooks/useSubscriptionGate.ts` reads that row and exposes `isBlocked` / `daysRemaining`.
- `src/components/auth/SubscriptionGateModal.tsx` shows "Your 30-day free access period has expired. Subscribe to continue…".
- `AppLayout` and `PatientAppLayout` already have the gate commented out (`{/* Subscription gate disabled during MVP phase */}`), so the modal is not currently rendered — good.
- `TrialSignupSection` is just the T&C consent checkbox; it doesn't mention a trial. The signup CTA was already changed from "Start Free Trial" to "Create Account".
- No toast like "Your trial has started" is fired today; the only post-signup toast is `"Account created! Check your inbox…"`.

## Changes

1. **`src/pages/Auth.tsx`** — Remove the free-period subscription insert (the `await supabase.from("subscriptions").upsert({...})` block and the `freeEndsAt` setup, lines ~374–386). New users will simply have no `subscriptions` row, which `useSubscriptionGate` already treats as "don't block, no countdown".

2. **`src/components/auth/SubscriptionGateModal.tsx`** — Rewrite the copy so it no longer references a "30-day free access period" or implies a trial ended. Generic wording: heading "Subscription Required", body "Subscribe to continue using all features." Kept as a component so it can be reused later, but with no trial language. (The modal is still not rendered anywhere during MVP.)

3. **`src/hooks/useSubscriptionGate.ts`** — Force `isBlocked = false` and `daysRemaining = null` for the MVP, so even if some surface reads it later, it can never produce a "trial expiring in N days" value. Leave the existing query in place but short-circuit the result.

## Out of scope

- No DB migration. Existing rows with `status: "free_period"` stay as-is; nothing reads them as a countdown anymore.
- No change to billing/Settings → Billing tab. Users can still voluntarily subscribe; we're only removing trial-period messaging.
- No change to `TrialSignupSection` (it's just the T&C checkbox and contains no trial wording).