## Goal

Tighten the Emergency Responder (Ambulance) portal so it matches the density and accordion patterns used in the Doctor and Patient profiles, consolidate "Admin" navigation, make hospital pickers respect real availability, and wire the Hospital Network screen to the live database.

## 1. Compact screen styling (parity with Doctor profile)

Apply to every screen under `src/modules/holarchelp/pages/provider/ambulance/*` and `src/modules/holarchelp/pages/provider/AdministratorsScreen.tsx`:

- Page header: replace `text-3xl font-extrabold` / oversized headers with the doctor-profile pattern — `text-2xl font-semibold tracking-tight` + `text-sm text-muted-foreground` subtitle in a `space-y-1` block.
- Outer wrapper: `space-y-4` (was `space-y-6`).
- Card chrome: `rounded-xl border border-border bg-card shadow-sm`, `CardHeader` `py-3`, `CardContent` `pt-0 space-y-3`.
- Typography: body `text-sm`, secondary `text-xs`, KPI numbers `text-lg font-semibold`.
- Rows: `py-2` not `py-4`; icons `h-4 w-4`.
- Buttons default `size="sm"`.

## 2. Standardized accordion pattern

Reuse the doctor/patient profile pattern (`src/pages/MyPractice.tsx` line 362-398):

```tsx
<Accordion type="single" collapsible className="space-y-3">
  <AccordionItem value="..." className="rounded-xl border border-primary bg-card shadow-sm">
    <AccordionTrigger className="px-4 py-3 hover:no-underline">…</AccordionTrigger>
    <AccordionContent className="px-4 pb-4 space-y-3">…</AccordionContent>
  </AccordionItem>
</Accordion>
```

Convert these to that exact pattern, collapsed by default:

- **Fleet Operations Vehicles** (`FleetPage.tsx` / `FleetOperationsScreen.tsx`) — wrap the vehicles list in one accordion item titled "Vehicles ({count})". KPI summary stays above the accordion.
- **Team Status** (`TeamStatusScreen.tsx`) — rename to **Shift Teams**, wrap the team roster in one accordion item "Shift Teams ({count})". Update sidebar label `nav.teamStatus` → `nav.shiftTeams` and i18n strings (English fallback for the 25 locales).

## 3. Admin consolidation

- Sidebar (`src/components/layout/ProviderSidebar.tsx`):
  - Rename `nav.userAdmin` value to **Admin**.
  - Remove the standalone **Hospital Network** entry from `ambulanceNav`.
- `AdministratorsScreen.tsx` becomes a tabbed shell:
  1. **Users** — current member list/dialog.
  2. **Hospital Network** — renders `HospitalNetworkScreen` inline.
- Route `/provider/ambulance/hospital-network` redirects to `/provider/ambulance/admins?tab=hospital-network`; the tab reads `?tab=` from the URL.
- Page title: "Admin" (replacing "User Management").

## 4. Remove "Affiliate" and "Trauma" badges

Strip every "Affiliated" / "Affiliate" pill, the dotted/colored affiliated ring, and the red **Trauma** badge in:

- `ambulance/HospitalNetworkScreen.tsx` — drop the affiliated filter Select and the trauma pill from each card. Keep search + sort.
- `hospital/ProvidersScreen.tsx`, `ProviderAvailabilityPanel.tsx`, `AffiliatedDoctorsScreen.tsx`, `AffiliatedAmbulancesScreen.tsx`.
- `ambulance/IncidentManagementScreen.tsx`, `AffiliatedHospitalsScreen.tsx`.
- `hospital/HospitalSelectionScreen.tsx` — remove any trauma pill rendered on hospital cards.

Underlying `affiliated` / `trauma` fields stay intact — only the badges/filters are removed.

## 5. Wire Hospital Network to the live database

Replace the mock `HOSPITALS` array in `ambulance/HospitalNetworkScreen.tsx` with a Supabase-backed query against `public.holarchelp_hospitals`.

Data flow:

- New hook `src/modules/holarchelp/hooks/useHospitalNetwork.ts`
  - React Query key: `["hospital-network", { acceptingOnly }]`.
  - Selects from `holarchelp_hospitals`: `id, name, address, city, province, contact_phone, contact_email, accepting_patients, beds_available, er_status, latitude, longitude`.
  - Returns rows ordered by `name`.
- New hook `useAvailableHospitals()` — wraps the above with `acceptingOnly: true` and is shared with every hospital selector (`hospital/HospitalSelectionScreen.tsx`, dispatch pickers, ambulance combobox).
- Distance/ETA columns: computed client-side from the provider's current geolocation (already available via `useProviderAccess` location, fall back to `—` when unknown). No mock numbers.
- Wait time: read `beds_available` and `er_status` instead of mocked `wait`. Show "Accepting" / "Diverting" / "Closed" chip derived from `er_status`.
- Search filter runs against `name`, `city`, `address`.
- Sort options: "Name" and "Distance" (only when geolocation present).
- Loading skeletons + empty state ("No hospitals available right now") use existing shadcn `Skeleton`.

## 6. Availability-gated hospital selection

Every selector lists hospitals only when `accepting_patients = true` (and `er_status != 'closed'`):

- `hospital/HospitalSelectionScreen.tsx` — switch to `useAvailableHospitals()`.
- Any other Select/Combobox listing hospitals (search `holarchelp_hospitals` queries) refactored onto the shared hook.
- Hospital Network admin tab itself shows all rows but greys non-accepting ones and labels them; selection contexts hide them entirely.

## 7. Workflow linkage

- Toggling `accepting_patients` from the Hospital Network admin tab invalidates `["hospital-network"]` so dispatch pickers refresh immediately.
- Users tab mutations invalidate `["provider-members", providerId]` (used by Shift Teams + Driver Management).
- Vehicle status changes inside the Fleet Operations accordion invalidate `["ambulance-fleet", providerId]` (consumed by `EmergencyDashboardScreen`).

## Technical notes

- New files: `src/modules/holarchelp/hooks/useHospitalNetwork.ts`, `useAvailableHospitals.ts`.
- Edited files (~20): sidebar, routes-provider, AdministratorsScreen, HospitalNetworkScreen, TeamStatusScreen, FleetPage/FleetOperationsScreen, all `Affiliated*` screens, `ProvidersScreen`, `ProviderAvailabilityPanel`, `IncidentManagementScreen`, `HospitalSelectionScreen`, locale files.
- No DB migrations required; `holarchelp_hospitals` already has `accepting_patients`, `er_status`, `beds_available`, contact, and geo columns. RLS is already configured to allow authenticated reads of approved hospitals.
- No business-logic changes outside the availability filter, cache invalidation hooks, and the mock→DB switch.
