# Plan: Public Provider Signup + Drop Failed Email Domain + Nav Font Bump + Admin-Type User + Prominent Sign-Up Button

Cumulative plan covering all outstanding requests.

## 1. Make `/provider-signup` a real public vetting form

`src/pages/ProviderSignup.tsx` currently shows a disabled "Onboard your organisation" screen with only a `mailto:` link. Prospective Hospitals / Emergency Response providers must be able to complete the vetting form themselves.

- Rewrite `src/pages/ProviderSignup.tsx` to embed `ProviderVettingForm` (Hospital / ER variant) inline inside a card on the public page.
- Keep the page header, hero icon, and title "Onboard your organisation". Replace the disabled-state body with a one-sentence intro stating the team reviews submissions within 6 hours.
- The existing in-form `Clock` "approval within 6 hours" banner stays above submit.
- On success, show the form's built-in green success state (6-hour SLA + inbox reminder) plus a `Return to Home` button. No redirect to `/admin/users`.
- Remove the `mailto:onboarding@holarchealth.com` block. Keep the bottom `I already have an account — sign in` button.
- `ProviderVettingForm` gains an optional `mode: "public" | "admin"` prop so it can render standalone and branch its submit logic.
- Public submissions write to `pending_providers` as `anon`. New migration adds:
  - `GRANT INSERT ON public.pending_providers TO anon`
  - INSERT policy `WITH CHECK (status = 'pending')`
  - Storage policy on the license bucket allowing `anon` INSERT scoped to a generated uuid prefix.
- Admin review in `/admin/users` via `PendingProviderReviewDialog` is unchanged.

## 2. Abandon `notify.nigeria.holarchealth.com`

- Remove the `supabase.functions.invoke("send-transactional-email", { templateName: "provider-vetting-received", ... })` call (and surrounding `try/catch`) from `src/features/admin/components/CreateTestUserDialog.tsx`.
- Public `/provider-signup` does not call any email function either; confirmation is on-screen only.
- The unused `provider-vetting-received` template is left in place (harmless). The workspace domain entry can be removed by the user in Cloud → Emails. No DNS work.

## 3. Bump laptop/desktop nav menu item font by one step

- Desktop sidebar nav items currently render at `text-sm`. Increase to `text-base` at `lg:` and above for primary nav links in both Doctor and Patient sidebars.
- Icons bump proportionally (`h-4 w-4` → `h-5 w-5`); row padding adjusted so the 44px touch target remains.
- Mobile bottom-nav typography is untouched.

## 4. Allow Admin to create another Admin-type user

In `src/features/admin/components/CreateTestUserDialog.tsx` the role selector offers patient/doctor/nurse/hospital/er variants. Add an `Admin` option.

- When `admin` is chosen, hide patient/doctor/vetting-specific fields; show only Full name, Email, Password.
- After creating the auth user, insert a row into `user_roles` with `role = 'admin'` for that user_id.
- Gate the new option client-side via `useIsAdmin()`. Server enforcement relies on existing `user_roles` RLS; if no admin-INSERT policy exists, add it in the same migration as step 1:
  - `CREATE POLICY "Admins can grant roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'))`
- Success toast: "Admin user created. They can now sign in with full admin access."

## 5. Make the Sign Up button more prominent on the login page (NEW)

On `src/pages/Auth.tsx` the Sign Up affordance is currently a low-visibility text link beneath the Sign In form. Promote it so new users can find it instantly.

- Replace the inline "Don't have an account? Sign up" text with a dedicated full-width **Sign Up** button styled as a high-contrast secondary CTA: solid teal background (`bg-primary`), white text, large size (`size="lg"`), bold weight, rendered directly below the Sign In submit button with a clear divider ("New here?") above it.
- Add a small supporting line ("Create your free Holarc Health account in under a minute") in muted text under the button.
- Tab order: Email → Password → Sign In → Sign Up. Forgot password link keeps `tabIndex={-1}`.
- Behaviour unchanged: clicking switches the form to sign-up mode (or routes to the sign-up tab/view that already exists).
- No change to sign-up logic, validation, or password-visibility toggles.

## Out of scope
- No email sending re-enabled anywhere.
- No changes to vetting form field order, validation, green frames, country-code phone input, or "Same as Hospital" mirroring.
- No changes to mobile bottom-nav typography.
- No changes to Patient/Pharmacy signup flows.

## Files changed
- `src/pages/ProviderSignup.tsx` — rewritten to embed `ProviderVettingForm` for public use.
- `src/features/admin/components/ProviderVettingForm.tsx` — add `mode` prop; branch submit between public-anon and admin-authenticated paths.
- `src/features/admin/components/CreateTestUserDialog.tsx` — remove email invoke; add Admin role option + conditional fields and role-grant insert.
- Desktop sidebar nav components (Doctor + Patient) — bump `text-sm` → `text-base` and icon sizing at `lg:`.
- `src/pages/Auth.tsx` — promote Sign Up to a prominent full-width CTA button with divider and supporting copy.
- New migration: `pending_providers` anon INSERT policy + GRANT, license-bucket storage policy, and (if missing) `user_roles` admin-grant INSERT policy.
