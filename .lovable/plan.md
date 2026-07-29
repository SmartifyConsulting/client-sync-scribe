## Goal

Add a **new** Hospital Admin Dashboard alongside the existing one (nothing removed). Phase 1 = KPI row + Bed status by ward + Active alerts, live from the database, ward filter, 10s auto-refresh.

## What I verified first

- Tables exist: `hospital_wards`, `hospital_beds`, `hospital_inpatient_admissions`, `hospital_staff_shifts`, `prescriptions`, `holarchelp_incidents`.
- **All of `hospital_wards`, `hospital_beds`, `hospital_inpatient_admissions`, `hospital_staff_shifts` currently have 0 rows** — so the dashboard would render blank without seed data. Seeding is part of this plan.
- `prescriptions.status` today only has `active` / `cancelled` (no `pending`), and shifts have no `sick_leave` status yet — those will be introduced via the seeded demo rows and treated as valid status values.

## Data mapping

| KPI | Source |
| --- | --- |
| Bed occupancy | active `hospital_inpatient_admissions` (status `admitted`) ÷ count of `hospital_beds` for the hospital's wards (falls back to ward `bed_capacity` if no bed rows) |
| ER wait time | `holarchelp_incidents` heading to this hospital not yet `at_hospital` — average minutes since `created_at` + count |
| Ready for discharge | inpatient admissions with status `discharge_pending` |
| Staff on duty | today's `hospital_staff_shifts` clocked in vs. rostered, plus count with status `sick_leave` |

## Build steps

1. **Seed demo data** (migration-free, via data insert) for one hospital — **Netcare Milpark Hospital** unless you name another:
   - 5 wards (ICU, General A, General B, Maternity, Paediatrics) with capacities totalling ~128 beds, plus `hospital_beds` rows.
   - 8 inpatient admissions linked to existing patient records — mix of `admitted` and `discharge_pending` (2 of them created >6h ago to trigger the high-priority alert).
   - ~12 staff shifts today: mostly clocked in, 3 with status `sick_leave`.
   - A few `prescriptions` rows with status `pending` created within the last 2 hours.
2. **New hook** `useHospitalAdminStats(hospitalId, wardId)` — one batched fetch of wards, beds, admissions, shifts, prescriptions, ER incidents; recomputes derived KPIs; refetch every 10s and exposes `lastUpdated`.
3. **New screen** `HospitalAdminDashboard.tsx`:
   - Header: title, ward filter (tabs on desktop / select on mobile, "All wards" default), "Last updated: Xs ago" + manual refresh.
   - KPI row: 4 cards in the existing `StatCard` style (percentage + raw counts).
   - Left column: per-ward progress bars `Ward A (ICU) — 18/20`, bar red >85%, amber 70–85%, green <70% (semantic tokens `destructive` / `warning` / `success`).
   - Right column: 4 alert cards — long-waiting discharge_pending, sick-leave staffing, pending pharmacy scripts, and a green "no critical incidents in 24h" card.
4. **Route + nav**: `/provider/hospital/admin-dashboard`, added to the hospital sidebar as "Admin Dashboard" beneath the existing Dashboard entry. The existing `HospitalDashboardScreen` stays exactly as is.
5. i18n keys added to `en.json` for all new labels.

## Deferred to your next go-ahead

ER queue panel, recent-activity timeline, and the ER Dashboard redesign.

## Technical notes

Styling reuses existing card/panel patterns and semantic color tokens only (no hardcoded colors). Hospital id comes from `useProviderAccess()`. Refresh uses a single interval cleaned up on unmount; no realtime subscriptions added in Phase 1.
