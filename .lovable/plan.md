## 1. Rename pricing tiers + add Emergency Services

`src/features/admin/pages/PricingAdmin.tsx`:
- Tier 01 title `Practitioners` → **`Tier 01: Healthcare Providers`**, badge stays `Doctor` (internal role key).
- Tier 02 title `Healthcare Seekers` → **`Tier 02: Patient`**.
- Add **`Tier 03: Emergency Services`** section (badge `Emergency`) — same RoleSection component, role key `emergency`.
- Update header copy: "Define the financial structure for healthcare providers, patients, and emergency services."
- Extend `calculateSavings` calls + `pricing.find` lookups to include the `emergency` role.

## 2. Database migration

New migration to support the 3rd tier:
- `pricing_config`: drop existing `pricing_config_role_check`, recreate as `CHECK (role IN ('doctor','patient','emergency'))`.
- `subscriptions`: drop `subscriptions_plan_type_check`, recreate as `CHECK (plan_type IN ('doctor','patient','emergency'))`.
- Seed two rows for `emergency`: monthly + annual (e.g. $19.99 / $199.99 placeholders — admin can edit).

## 3. PayPal subscription edge function (mirror SnappyNDA architecture)

Refactor `supabase/functions/paypal-subscription/index.ts`:
- Add `PAYPAL_ENV` env var (`sandbox` default, `live` allowed) → `PAYPAL_BASE = sandbox.paypal.com | api-m.paypal.com`. Currently hardcoded to sandbox.
- Replace hardcoded `PLANS` constant with **DB lookup against `pricing_config`** by `(role, billing_cycle)` so admin price edits apply immediately and the new `emergency` tier works automatically.
- Add `zod` body validation for the three actions (`create-trial`, `cancel`, `reactivate`, default new-subscription) — `planType ∈ {doctor,patient,emergency}`, `billingCycle ∈ {monthly,annual}`.
- Keep existing auth check (`auth.getUser` against caller's JWT, enforce `userId === caller.id`).
- Keep capture/return + email + referral logic intact.

## 4. Subscription UI

`src/components/settings/SettingsContent.tsx`:
- Replace `const planType = role === "patient" ? "patient" : "doctor"` with a mapper that returns `"emergency"` for emergency-services roles (ambulance_staff / hospital_staff / blood_bank), `"patient"` for patient, else `"doctor"`.
- `fetchPricing` already pulls from `pricing_config` — extend to handle emergency.
- `Subscription.plan_type` typing already `string`; copy in dialog updates to "your {planType} subscription" (already dynamic).

`src/components/auth/SubscriptionGateModal.tsx` & `TrialSignupSection.tsx`: copy unchanged (still says "from $9.99"); no change needed for this task.

## 5. Memory

Add `mem://features/subscription-tiers` noting the three role keys (`doctor` = Healthcare Providers, `patient` = Patient, `emergency` = Emergency Services), DB-driven pricing, and `PAYPAL_ENV` switch.

## Files

- Edit: `src/features/admin/pages/PricingAdmin.tsx`
- Edit: `supabase/functions/paypal-subscription/index.ts`
- Edit: `src/components/settings/SettingsContent.tsx`
- New migration: pricing_config + subscriptions check constraints + emergency seed rows
- New memory file + index update

## Out of scope
- No PayPal webhook listener (still relies on capture-on-return).
- No live PayPal credentials swap — `PAYPAL_ENV` defaults to sandbox; flip to `live` via secret when ready.
- Emergency-services price defaults are placeholders; admin tunes in /admin/pricing.
