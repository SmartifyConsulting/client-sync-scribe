## Unified "I am a..." dropdown across Auth + Landing

Both surfaces ("Get Started" on Landing → **Join Holarc** dialog, and **Create your free account** on `/auth`) only expose 3 tiles and bury Pharmacy/Insurance/ER. Replace them with a single dropdown that lists every user type.

### Dropdown options (same on both screens, in this order)

1. Patient
2. Healthcare Provider (Doctor)
3. Hospital
4. Emergency Service Provider (ER / Ambulance)
5. Insurance Company
6. Pharmacy

### Behaviour

- **Patient** → continues current patient signup flow on `/auth?mode=signup&role=patient`.
- **Healthcare Provider** → continues current doctor signup flow on `/auth?mode=signup&role=doctor`.
- **Hospital / ER / Insurance / Pharmacy** → routes to `/provider-signup?kind=hospital|emergency|insurance|pharmacy`, which preselects the matching kind in the existing organisation signup form.

### Files changed

1. **`src/pages/Landing.tsx`** — replace the 3-card grid inside the "Join Holarc" dialog with a `<Select>` (Patient first) plus a Continue button. Keep title "Join Holarc" and subtitle "How will you use the platform?". `handleRoleSelect` extended to handle all 6 values.
2. **`src/pages/Auth.tsx`** — replace **both** occurrences of the 3-tile `RadioGroup` (doctor signup step 0 and patient signup step 0) with the same Patient-first `<Select>`. Selecting an organisation type immediately navigates to `/provider-signup?kind=...`; selecting Patient/Healthcare Provider sets `userRole` and keeps the user in the existing form.
3. **`src/pages/ProviderSignup.tsx`** — read `?kind=` query param on mount and preselect the dropdown so deep links from Landing/Auth land on the right form.

### Out of scope

- No backend/schema changes.
- No changes to the actual signup forms below the picker.
- No changes to provider vetting form contents.
