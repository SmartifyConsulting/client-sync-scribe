# Plan

## 1. Telematics reporting for Emergency Providers

Goal: continuously record where every ambulance/driver is, every stop, dwell time, and the full trip back to home station — viewable by ER admins.

### Data model (migration)
- New table `holarchelp_telematics_pings` — high-frequency GPS samples
  - `id`, `provider_id`, `vehicle_id` (FK `ambulance_fleet`, nullable), `user_id`, `incident_id` (nullable), `lat`, `lng`, `speed_kph`, `heading`, `accuracy_m`, `battery`, `recorded_at`, `created_at`
- New table `holarchelp_telematics_stops` — derived dwell events
  - `id`, `provider_id`, `vehicle_id`, `user_id`, `incident_id`, `lat`, `lng`, `place_label` (home_station / scene / hospital / unknown), `arrived_at`, `departed_at`, `dwell_seconds`
- New table `holarchelp_telematics_trips` — shift/trip envelope
  - `id`, `provider_id`, `vehicle_id`, `user_id`, `started_at`, `ended_at`, `start_lat/lng`, `end_lat/lng`, `distance_m`, `max_speed_kph`, `avg_speed_kph`, `idle_seconds`, `returned_home` bool
- GRANTs + RLS: drivers insert own pings; ER admins/owners of the provider SELECT all rows for their `provider_id`.

### Ingestion
- Extend `useProviderLocationTracking` / `useLiveProviderLocation` to also write into `holarchelp_telematics_pings` every ~5 s while a shift OR incident is active.
- New hook `useShiftTelematics(providerId, vehicleId)` started from `StartShiftDialog` / `paramedic_shifts` lifecycle.

### Derivation (edge function `telematics-rollup`, pg_cron every 5 min)
- Detect stops (speed < 3 kph for ≥ 90 s) → upsert `holarchelp_telematics_stops`.
- Label stops by proximity to home station / incident scene / destination hospital.
- Close trip when vehicle returns within 150 m of home for ≥ 5 min; compute distance/avg/max/idle.

### UI
- New route `/provider/ambulance/telematics` (ER admin gated) with three tabs:
  - **Live fleet** — map with each vehicle's last ping, status chip, current dwell timer.
  - **Trips** — table per driver/vehicle/day: start, end, distance, stops count, returned-home; expandable stop-by-stop timeline.
  - **Replay** — animated polyline with speed colouring.
- Nav entry "Telematics" inside `AmbulanceOpsLayout`.
- Driver badge on `NavigationScreen` showing "Recording shift telematics" when active.

## 2. Tab headings not translating
- Audit `TabsTrigger` usages across Patients, Documents, MyPractice, Admin, Sessions, ProviderSignup, holarchelp ops layouts.
- Wrap labels with `t("tabs.<key>", "Fallback")` and add a `tabs` namespace in `src/i18n/locales/en.json` (other 24 locales mirror English; real translations filled per language batch).
- Same treatment for top-level page `<h1>/<h2>` headings.

## 3. Per-profile flag persistence
- Add `preferred_language text default 'en'` to `profiles` (migration).
- On login / profile switch, read `profile.preferred_language` → `i18n.changeLanguage(...)`; write back when user changes via `LanguageSwitcher`.
- `localStorage` remains anonymous fallback; profile value wins once signed in.

## 4. Royal-blue language switcher icon
- Update `LanguageSwitcher.tsx` button: royal-blue background (`bg-[hsl(225_73%_38%)]`), white text/border, flag visible on the blue chip; hover lightens. Same in `MobileHeader`.

## 5. Auto-responsive font sizing on language change
Different languages produce wildly different string widths (German +30%, CJK shorter, Arabic taller). The app must rescale text to fit without breaking layout.

### Approach
- **Global fluid base** — in `src/index.css` set `html { font-size: clamp(13px, 0.78vw + 10px, 17px); }` so every `rem`-based size scales with viewport.
- **Per-language scale token** — new CSS variable `--lang-scale` on `<html>` (default `1`). Apply in `src/i18n/index.ts` `languageChanged` handler:
  - de, nl, ru, el, pl, tr, fr, pt → `0.94`
  - ha, ig, yo, sw, sn, zu, xh → `0.96`
  - zh, ja, ko → `1.02`
  - ar, he → `1.0` (RTL already handled)
  - en, others → `1`
- Multiply into base: `html { font-size: calc(clamp(13px, 0.78vw + 10px, 17px) * var(--lang-scale, 1)); }`.
- **Auto-fit primitive** — new `<AutoFitText>` component (and `useAutoFitText` hook) used by:
  - `Sidebar` nav labels
  - `TabsTrigger` labels
  - Page `<h1>/<h2>` headings
  - Buttons inside fixed-width chips (status pills, role badges)
  - Measures rendered width vs container; shrinks `font-size` in 0.5 px steps down to a per-element minimum (e.g. 11 px for nav, 12 px for tabs) until it fits one line. Re-runs on `i18n.on('languageChanged')` and `ResizeObserver`.
- **Tab strip overflow guard** — when a `TabsList` would overflow even after shrink, switch to horizontal scroll with edge fades (already partly present; standardise).
- **Truncation as last resort** — keep `truncate` + `title={fullLabel}` so hover tooltip shows full text.

### Technical notes
- No PII added; pings are provider-scoped and RLS-protected.
- pg_cron + pg_net already enabled for `telematics-rollup`.
- Raw pings retained 30 days via scheduled delete; stops/trips kept indefinitely.
- `AutoFitText` uses `requestAnimationFrame` + `ResizeObserver`; cleaned up on unmount to avoid layout-thrash.
