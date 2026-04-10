

# Change from 7-Day Trial to 30-Day Free Access + Subscription Gate

## Summary

Replace the current "7-day trial with immediate PayPal setup" flow with a new model: users sign up freely, get 30 days of full access with no payment required, and after 30 days are prompted to subscribe before they can use features.

## How it works

1. **Signup**: No PayPal required. User is told they get 30 days free, after which they must subscribe.
2. **Subscription record**: Created with `status: 'free_period'` and `trial_ends_at` set to 30 days from signup.
3. **Access gate**: A new `useSubscriptionGate` hook checks if the free period has expired AND the user has no active subscription. If expired, a full-screen modal blocks the app and directs the user to Settings > Billing to subscribe.
4. **Settings/Billing**: Already has the PayPal subscribe flow — no changes needed there.

## Plan

### 1. Update `TrialSignupSection` messaging

**File:** `src/components/auth/TrialSignupSection.tsx`

- Change "7-Day Free Trial" to "30-Day Free Access"
- Remove PayPal references from signup — say "No payment required to start"
- Update bullet points: "Full access for 30 days", "No credit card or PayPal needed", "Subscribe after 30 days to continue"
- Update the terms checkbox text to reflect 30-day free period and that subscription is required after

### 2. Update signup flow to skip PayPal

**File:** `src/pages/Auth.tsx` (lines 420-448)

- Change trial duration from 7 days to 30 days
- Change status from `trial_pending` to `free_period`
- Remove the PayPal `create-trial` invocation entirely
- Navigate directly to `/dashboard` after signup

### 3. Create `useSubscriptionGate` hook

**New file:** `src/hooks/useSubscriptionGate.ts`

- Fetches the user's subscription from `subscriptions` table
- Returns `{ isBlocked, daysRemaining, loading }`
- `isBlocked = true` when: status is `free_period` AND `trial_ends_at < now()` AND no active/paid subscription exists
- Also returns `daysRemaining` for showing a countdown banner

### 4. Create `SubscriptionGateModal` component

**New file:** `src/components/auth/SubscriptionGateModal.tsx`

- Full-screen overlay (not dismissible) shown when `isBlocked` is true
- Message: "Your 30-day free access has ended. Subscribe to continue using the app."
- "Subscribe Now" button links to `/settings?tab=billing`
- Shows pricing info (monthly/annual)

### 5. Add gate check to `AppLayout`

**File:** `src/components/layout/AppLayout.tsx`

- Use `useSubscriptionGate()` hook
- If `isBlocked`, render `SubscriptionGateModal` instead of the normal layout
- Optionally show a banner when `daysRemaining <= 7` warning the user their free period is ending

### 6. Database migration

Update `subscriptions` table to allow `free_period` as a valid status value (check if status is an enum or text — if text, no migration needed).

## Technical Summary

| File | Change |
|------|--------|
| `src/components/auth/TrialSignupSection.tsx` | Update messaging to 30-day free, remove PayPal references |
| `src/pages/Auth.tsx` | Change trial to 30 days, skip PayPal call, set status `free_period` |
| `src/hooks/useSubscriptionGate.ts` | New hook: check if free period expired + no active sub |
| `src/components/auth/SubscriptionGateModal.tsx` | New: blocking modal when access expired |
| `src/components/layout/AppLayout.tsx` | Integrate gate check, show modal or warning banner |
| Migration (if needed) | Allow `free_period` status in subscriptions |

