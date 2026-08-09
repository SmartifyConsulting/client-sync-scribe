# Hero polish, hospital nav consolidation, grouped patient activity

## 1. Hero copy

- Intro paragraph drops from 18px to 16px.
- The tagline block stops being a fixed narrow centred column: the eyebrow, bracketed slogan and intro paragraph run the full width of the left column, so the copy flows left-to-right right up to the card mosaic on the right.
- The intro paragraph is justified (text-justify); eyebrow and slogan stay as-is in alignment terms but follow the wider column.
- Logo position and size stay unchanged.

## 2. Capability image

- Replace the current capabilities graphic with the newly supplied waveform image (includes the "Increased Governance" pill), registered through the asset pipeline and swapped into the hero. The old asset pointer is removed.

## 3. Duplicate 360 on hero

- The patient benefits heading currently reads "… 360° 360° View." (green then black). Remove the black "360°" so it reads "… 360° View." with the green mark only. Done via the English copy string; other locales with the same duplication get the same trim.

## 4. Hospital navigation

- Rename "Incoming Ambulances" to "Incoming ER" (label and translation key value).
- Remove the "Hospital Admin" item from the Administration section. "Admin" (admin-user management) stays.
- The `/provider/hospital/admin-dashboard` route redirects to `/provider/hospital/dashboard` so old links still land somewhere sensible.

## 5. Merge Hospital Admin into Dashboard

Everything currently on the Hospital Admin dashboard is folded into the main hospital Dashboard, deduplicated against what the Dashboard already shows:

- KPI row: bed occupancy, ER wait time, ready-for-discharge, staff on duty (replacing/absorbing the existing stat cards).
- Ward filter and refresh control in the Dashboard header.
- Bed status by ward with the coloured progress bars.
- Active alerts and issues panel (discharge backlog, staffing, pharmacy, critical incidents).
- ER queue panel with triage badges and wait times.
- Existing Dashboard panels (affiliated vehicles, inpatients) are kept.

The standalone HospitalAdminDashboard component is removed once its content lives on the Dashboard.

## 6. Patient activity grouping

- The patient activity timeline on the Dashboard is grouped under three headings: Today, This Week, This Month (plus an Earlier bucket for anything older), each bucket ordered newest first and hidden when empty.

## Technical notes

- Files: `src/pages/Landing.tsx`, `src/i18n/locales/*.json` (nav + benefits strings), `src/modules/holarchelp/nav/registry.ts`, `src/modules/holarchelp/routes-provider.tsx`, `src/modules/holarchelp/pages/provider/hospital/HospitalDashboardScreen.tsx`, `src/modules/holarchelp/components/ActivityTimeline.tsx`, plus removal of `HospitalAdminDashboard.tsx`.
- Dashboard reuses the existing `useHospitalAdminStats` / `useWardOptions` hooks rather than re-querying.
- Grouping logic uses client-local date boundaries via the existing date helpers.
