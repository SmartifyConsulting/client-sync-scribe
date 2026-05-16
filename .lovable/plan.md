## Landing page + admin + calendar updates (MVP polish)

### 1. Disable trial / subscription gate (MVP phase)
- `src/components/layout/AppLayout.tsx`: stop rendering `<SubscriptionGateModal />` and the amber "free access ends in N days" banner. Keep the `useSubscriptionGate` hook untouched so it can be re-enabled later.
- `src/pages/Auth.tsx`: replace the `TrialSignupSection` usage in both signup paths with a minimal Terms & Conditions checkbox (re-using the existing consent links from `TrialSignupSection`, but stripped of the 30-day messaging and pricing block). Keep `acceptedTerms` gating.
- Keep DB writes that create the `free_period` subscription row (harmless; nothing reads it now).
- No deletes to `SubscriptionGateModal.tsx` / `TrialSignupSection.tsx` — leave files in place for future restoration.

### 2. Prominent "Download the mobile app" message on landing
- `src/pages/Landing.tsx`: add a new highlighted strip directly under the hero CTA row (above the trust strip) that promotes the mobile app.
- Visual: full-width pill on mobile / inline card on desktop with a phone/QR icon, headline "Get Holarc on your phone", subline "Available on iOS and Android — your full health story in your pocket.", and two outline buttons "App Store" + "Google Play" (linking to `#` placeholders for now).
- Style: gradient background `from-primary/10 to-[#E01837]/10`, primary border, slight shadow, animated fade-in. Render on all viewports, sticky-ish prominence (not actually sticky).

### 3. Hero button typography parity
- `src/pages/Landing.tsx` (nav at line 116–125): give the "Login" and "Get Started" nav buttons the same `text-base` (matches the `size="lg"` Doctors / Patients outline buttons in the hero). Add `size="lg"` and matching `btn-pill` styling to "Login", keep "Get Started" with `size="lg"` and `text-base`.

### 4. Rename "+5 Vulas earned" → "+5 Rewards earned"
- `src/pages/Landing.tsx` line 282: change the span text from `+5 Vulas earned` to `+5 Rewards earned`. No other copy on the landing references Vulas.

### 5. Hero ecosystem coverage for Emergency Services & Hospitals
- `src/pages/Landing.tsx`:
  - **Capability pills** (line 171 array): append three pills — `{ icon: Siren, label: "Emergency SOS" }`, `{ icon: Ambulance, label: "Ambulance Dispatch" }`, `{ icon: Building2, label: "Hospital Network" }` (icons from `lucide-react`).
  - **Feature mosaic** (the 2-column grid at line 244): add one new card spanning both columns describing Emergency Services — title "HolarcHelp SOS", subline "One-tap dispatch to nearby ambulances and hospitals with live location, ETA tracking, and full medical context shared on arrival." Include three mini-badges: "Ambulance providers", "Hospitals", "Blood banks".
  - **Provider Benefits section** (`providerBenefits` data — referenced at line 388): add 2 entries — "Emergency Service Providers" and "Hospital Partners" — describing how ambulance/hospital staff onboard, accept incidents, and view patient context.

### 6. Shared practice calendar → per-doctor dropdown filter
- `src/pages/CalendarView.tsx`:
  - When `scope === 'practice'`, add a `<Select>` doctor filter ("All doctors in practice" + one row per `members[].doctor_id` showing `full_name` and color swatch).
  - Persist selection in local state `selectedDoctorId: string | 'all'`. Default `'all'`.
  - Modify the `fetchAppointments` query (line 184): when a specific doctor is selected, swap `practice_id` filter for `.eq('user_id', selectedDoctorId)` (still inside the practice scope branch). When `'all'`, keep current behaviour.
  - Add `selectedDoctorId` to the effect dependency array (line 222).
  - UI placement: next to the existing scope tabs (line 400).

### 7. Reverse-impersonation entry for admin-seeded test users
- `src/components/layout/TopBarIcons.tsx`:
  - The hardcoded `TEST_PROFILES` list (line 31–40) is the canonical "added by Georgia" group. For any signed-in user whose email matches one of these (excluding `info@georgiaadams.co.za` itself), render a single "Switch to Admin (Georgia Adams)" entry in the profile-switcher popover — same UI affordance as the admin-only switcher, but visible to non-admins.
  - Reuse the existing `impersonate()` helper. It calls `admin-impersonate` edge function.
- `supabase/functions/admin-impersonate/index.ts`: relax authorization so that when the **target** email is `info@georgiaadams.co.za` AND the **caller** is one of the seeded test emails (whitelist), the function issues the magic link. All other impersonation paths remain admin-gated.

### Out of scope
- No data model changes, no payments work, no removal of the trial subscription DB rows, no changes to mobile bottom-nav, no real App Store / Play Store links (placeholders only).

### Files touched
- `src/components/layout/AppLayout.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Landing.tsx`
- `src/pages/CalendarView.tsx`
- `src/components/layout/TopBarIcons.tsx`
- `supabase/functions/admin-impersonate/index.ts`
