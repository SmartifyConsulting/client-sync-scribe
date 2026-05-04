## Scope

Four updates around HolarcHelp:

1. Add SOS + Nearby buttons to the patient **My Profile** view (currently only on Dashboard).
2. Restructure `/admin/holarchelp-providers` into a **single hub with three sub-tabs**: Providers, Accountability, SOS Voice Clip.
3. Add **incident history per patient** (visible on the patient's own profile and on a doctor's view of a patient).
4. Add **incident history per hospital/ambulance provider** (admin view, drill-down from Accountability).

---

## 1. SOS + Nearby on My Profile

File: `src/pages/patient/MyDetails.tsx` (the "My Profile" page at `/patient/my-details`).

Insert a compact red SOS card and an outline Nearby card at the top of the page (above the existing details editor), gated on `useHolarcHelpAccess`. Same visual style already used on `PatientDashboard` (red gradient + Siren icon, outline + MapPin icon). Both link to `/patient/holarchelp` and `/patient/holarchelp/contacts` respectively.

Note: The user said they don't see the SOS button on "My Profile". On `PatientDashboard` it already exists in Row 2. We're adding the same pair to `MyDetails.tsx` so it appears wherever the patient lands.

## 2. Admin hub — three sub-tabs

File: `src/pages/admin/HolarcHelpProviders.tsx` (rename heading to "HolarcHelp Admin"; route stays `/admin/holarchelp-providers`).

Replace the current page-level layout with a top-level Tabs component:

```text
[ Providers ] [ Accountability ] [ SOS Voice Clip ]
```

- **Providers tab** — current Hospitals/Ambulance accordion grouping + status filter + Import button (unchanged behavior, just nested inside the new outer tab).
- **Accountability tab** — embed the table from `HolarcHelpAccountability.tsx` (refactor it into a reusable `<AccountabilityPanel />` component so the standalone route `/admin/holarchelp-accountability` can keep working). Adds a "View incidents" action per row that opens a side sheet with the provider's recent incidents (see §4).
- **SOS Voice Clip tab** — current "SOS voice clip" card (upload MP3, show current default).

Sidebar: keep the existing "HolarcHelp Providers" link; remove the separate "Accountability" sub-link (it's now a tab).

## 3. Incident history per patient

New section on the patient's profile views.

Sources:
- For **patient viewing their own** profile (`MyDetails.tsx`): query `holarchelp_incidents` where `user_id = auth.uid()`, with the assigned provider's name (lookup via `assigned_provider_id` against `holarchelp_hospitals`/`holarchelp_ambulance_providers`).
- For **doctor viewing a patient** (`src/pages/PatientProfile.tsx`): query the same table where `user_id = patientRecord.patient_user_id`. RLS already permits patient + admin reads; we'll add a policy allowing doctors with active `doctor_patient_access` for that patient to read their incidents (read-only).

UI: A new collapsible section "Emergency incidents" listing each incident with date, severity chip, status, assigned provider, ETA/arrived timestamps, and a small link to view details. Empty state shows "No SOS calls on record."

## 4. Incident history per hospital/ambulance provider

Two surfaces:

- **Per-provider drill-down (admin)** — from the Accountability table, "View incidents" button opens a Sheet listing incidents where `assigned_provider_id = provider.id`. Columns: Date, Patient (name from joined profile, admin only), Severity, Status, Accepted at, Arrived at, Resolved at, Rating (from `holarchelp_incident_feedback`).
- **Per-provider standalone page** — new route `/admin/holarchelp-providers/:type/:id/incidents` (linked from the provider row Actions). Same table as the sheet, plus aggregate header (total incidents, accepts, avg arrival, avg rating).

Data: client-side `supabase.from("holarchelp_incidents").select(...).eq("assigned_provider_id", id)` — admin RLS allows full read.

---

## Technical details

### New/edited files

- `src/pages/patient/MyDetails.tsx` — add SOS + Nearby card row at top.
- `src/pages/admin/HolarcHelpProviders.tsx` — wrap content in 3 outer tabs.
- `src/pages/admin/HolarcHelpAccountability.tsx` — refactor table into exported `<AccountabilityPanel />` component; keep page as a thin wrapper.
- `src/pages/admin/HolarcHelpProviderIncidents.tsx` — NEW (per-provider incidents page).
- `src/components/holarchelp/PatientIncidentHistory.tsx` — NEW (re-used by `MyDetails.tsx` and `PatientProfile.tsx`).
- `src/App.tsx` — add `/admin/holarchelp-providers/:type/:id/incidents` route.
- `src/components/layout/Sidebar.tsx` — remove duplicate "Accountability" entry.

### Migration

```sql
-- Allow doctors with active access to read their patient's incidents (read-only)
CREATE POLICY "Doctors with access can read patient incidents"
ON public.holarchelp_incidents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access dpa
    WHERE dpa.patient_user_id = holarchelp_incidents.user_id
      AND dpa.doctor_id = auth.uid()
      AND dpa.is_active = true
  )
);
```
(Existing patient-self and admin policies stay.)

### Out of scope

- No changes to incident creation flow, voice clip schema, or accountability RPC.
- No design system changes — uses existing teal/red tokens, accordion, sheet, tabs.
