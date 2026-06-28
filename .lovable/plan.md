## Goal

Reformat every screen under the Emergency Responder portal (`/provider/ambulance/*`) so its visual language matches the Doctor profile (Dashboard, Patients, Sessions, etc.). Today the ambulance screens use ad‑hoc Tailwind colors (`bg-red-100`, `bg-blue-50`, `text-green-600`, raw emoji badges, inline `border-2`, mixed font weights) that violate the Style Manifest and look nothing like the Doctor pages.

No business logic, data, or routing changes — purely presentation.

## What "match the Doctor profile" means

Standards already used by the Doctor screens:

- `PageHeader` from `src/components/shared/PageHeader.tsx` for the title block (title + subtitle + actions, never a custom `<header>` with `text-3xl font-extrabold` + uppercase eyebrow).
- Cards via shadcn `Card / CardHeader / CardTitle / CardContent`, rounded‑xl, `border-border`, `bg-card`.
- Semantic tokens only: `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `sos`, `foreground`, `muted-foreground`. No `bg-red-*`, `bg-blue-*`, `bg-green-*`, `text-amber-*`, `dark:bg-*-950/20`, inline hex.
- Shared shadcn `Badge` for status pills (variants/tones via semantic tokens), shadcn `Button` for actions, shadcn `Tabs` for tab switching (not a row of `Button variant=outline`).
- Stat tiles use `StatsCard` (`src/components/dashboard/StatsCard.tsx`) like the Doctor dashboard.
- Mobile‑first, `max-w-7xl mx-auto`, `space-y-6`, 44px touch targets, `rounded-xl`, no horizontal overflow at 375px.
- All user‑facing strings go through `t()` (i18n) — many ambulance screens still have hardcoded English ("Current Shift ▼", "Track Live", "Team Summary", "Day Crew", etc.).

## Scope — every screen under `pages/provider/ambulance/`

1. AmbulanceOpsDashboard.tsx
2. EmergencyDashboardScreen.tsx
3. NavigationScreen.tsx
4. TeamStatusScreen.tsx
5. DriverManagementScreen.tsx
6. FleetOperationsScreen.tsx
7. FleetPage.tsx
8. FleetCalendarScreen.tsx
9. MaintenanceDashboardScreen.tsx
10. VehicleProfileScreen.tsx
11. VehicleAvailabilityScreen.tsx
12. VehicleAssignmentScreen.tsx
13. VehicleUtilisationScreen.tsx
14. VehicleTypeManagementScreen.tsx
15. HospitalNetworkScreen.tsx
16. HospitalsDirectoryScreen.tsx
17. AffiliatedHospitalsScreen.tsx
18. RealTimeMonitoringScreen.tsx
19. TelemetryHubScreen.tsx
20. TelematicsScreen.tsx
21. LiveSOSScreen.tsx
22. IncomingSosScreen.tsx
23. IncidentHistoryScreen.tsx
24. IncidentManagementScreen.tsx
25. VehicleAbuseScreen.tsx
26. GeofenceScreen.tsx
27. RouteDeviationScreen.tsx
28. AfterHoursScreen.tsx
29. UnlinkedTripsScreen.tsx

Plus the shared shell `AmbulanceOpsLayout.tsx` stats strip is already token‑based and stays as‑is.

## Refactor recipe applied to each file

For each screen:

1. Replace the bespoke header block with `<PageHeader title={t(...)} subtitle={t(...)} actions={...} />`.
2. Wrap content in `<div className="space-y-6">`; remove ad‑hoc `mt-2`, `mb-3` stacks.
3. Convert every panel/tile/section to `<Card>` + `<CardHeader>` + `<CardContent>`; drop `rounded-lg border bg-card p-4` repeats.
4. Replace stat tiles with `<StatsCard label value icon tone="default|success|warning|destructive" />`.
5. Replace status pills (e.g. `bg-green-100 text-green-800`, `bg-red-600 text-white`) with `<Badge variant="...">` mapped to semantic tokens (`success`, `destructive`, `warning`, `primary`, `secondary`).
6. Replace tab rows of `<Button>` with shadcn `<Tabs>`.
7. Replace emoji icons (🔔 🚑 ✓ 🌅 🌆 🏥 🚨) with `lucide-react` icons (Bell, Ambulance, CheckCircle2, Sunrise, Sunset, Hospital, Siren) sized via `lib/icon-sizes`.
8. Strip all raw color utilities and `dark:*` variants — colors come from `index.css` tokens only.
9. Wrap every visible string in `t("...")`; add the missing keys to `en.json` and run them through `uiTranslations.ts` so all 25 locales pick them up.
10. Ensure mobile breakpoint: grids collapse to `grid-cols-1` on mobile, `md:grid-cols-2`, `lg:grid-cols-3`.

## Technical notes

- Reuse existing `Card`, `Badge`, `Tabs`, `Button`, `Input`, `Select`, `Tooltip`, `Avatar` from `@/components/ui/*`.
- Reuse `PageHeader`, `StatsCard`, `TodaysBriefing` patterns where shape matches.
- Token reference: `src/index.css` defines `--primary` (teal), `--sos` (crimson), `--success`, `--warning`, `--destructive`, plus surface tokens.
- Do not touch data fetching, hooks, RPC calls, route definitions, or the providers/admins screens — only JSX/className.
- After edits run a build to confirm no TS regressions; sample 3 screens at 375px and 1280px to confirm parity with `PatientDashboard.tsx` / `Dashboard.tsx`.

## Out of scope

- Hospital portal screens (already mostly token‑based).
- Sidebar/navigation/layout shell.
- Adding/removing functionality, new charts, new data.
- Backend, RLS, or i18n infrastructure changes (only string additions).
