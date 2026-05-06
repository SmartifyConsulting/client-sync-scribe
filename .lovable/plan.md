## Goal

Add an "Emergency Service Provider" role choice to the sign-up flow. Selecting it routes users to a dedicated provider sign-up form with the requested field order and a Public/Private toggle.

## Changes

### 1. `src/pages/Auth.tsx` — add third role choice
- On the sign-up Account step (currently 2 cards: Healthcare Provider, Patient), make it a 3-card grid:
  - Healthcare Provider
  - Patient
  - **Emergency Service Provider** (new, ambulance icon)
- When "Emergency Service Provider" is chosen, hide the rest of the doctor/patient fields and show a single CTA button: **"Continue to provider sign-up"** that navigates to `/provider-signup`.
- No changes to existing doctor/patient flows.

### 2. `src/pages/ProviderSignup.tsx` — restructure form per requested order
Reorder and adjust fields to match the request:

1. Company name
2. Registration number
3. Address (street + city + country, kept as is)
4. **Service type — Public / Private** (RadioGroup, two cards) — maps to the `ownership` column on `holarchelp_ambulance_providers` (already exists, default `private`, CHECK constraint `public|private`)
5. Contact person **First name** + **Last name** (new fields, combined into `full_name` stored on `profiles` after sign-up)
6. Contact email
7. Contact phone
8. Password

Keep the existing Hospital/Ambulance toggle at the very top (it determines which provider table the row is inserted into). The user's request describes Emergency Service Provider broadly, and ambulance providers already have the `ownership` (public/private) column; hospitals will receive the same toggle written to a new `ownership` column (see migration below) so the form is consistent.

On submit:
- Sign up the user (email + password).
- Insert into `profiles` with `full_name = "{first} {last}"`.
- Insert into `holarchelp_ambulance_providers` or `holarchelp_hospitals` with `ownership` = public/private.
- Show "Application submitted, awaiting approval" toast and redirect to `/auth`.

### 3. Database migration
- Add `ownership text not null default 'private'` with CHECK (`public|private`) to `holarchelp_hospitals` so the Public/Private toggle persists for hospital providers too. (`holarchelp_ambulance_providers` already has it.)

### 4. Entry from Landing/Auth
- Add a small text link under the role cards on Auth: *"Are you a hospital or ambulance service? Sign up here"* → `/provider-signup` (redundant with the new role card but useful for users who arrive on the login screen).

## Out of scope
- No changes to provider approval flow, dispatch dashboard, or RLS policies.
- No new edge functions.
- The existing `/provider-signup` route already exists and is wired in routing — no router changes needed.

## Technical notes
- `holarchelp_ambulance_providers.ownership` already exists with CHECK (`public|private`) — reused directly.
- `holarchelp_hospitals` needs the same column added via migration before the form can write it.
- Contact person name is stored on `profiles.full_name` (not on the provider row) consistent with how doctor accounts store user identity.
