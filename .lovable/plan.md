## Scope

Five tightly related changes to the SOS / HolarcHelp surface:

1. Strip the SOS card, Nearby card, and Emergency incidents card off the patient profile page.
2. Move the Emergency incidents history under **Admissions** (My Holarchy → Admissions) as a sub-tab.
3. Replace the bottom-nav SOS tab with a floating **red shield FAB** in the bottom-right corner — red icon, red "SOS" label, no green/primary ring.
4. Slim down `HolarcHelpHome`: remove "Manage emergency contacts" and "Share my location" buttons.
5. Rework the SOS flow on `HolarcHelpHome` so that pressing SOS:
   - requires browser location to be granted (otherwise prompt / instruct the user),
   - shows a live map of the nearest emergency services to the user,
   - lets the patient **tap a marker / list item to select a provider** themselves, OR wait for a provider to accept,
   - and as soon as either path completes, the map disappears and a **green SOS pill** with the text "Help is on the way." takes its place.

---

## Files to change

### `src/pages/patient/MyDetails.tsx`
- Remove the two-card grid (SOS + Nearby) and the `<PatientIncidentHistory>` block.
- Drop now-unused imports (`Siren`, `MapPin`, `Card`, `CardContent`, `Link`, `PatientIncidentHistory`, `useHolarcHelpAccess`, `useAuth`).

### `src/features/patients/components/PatientDetailsEditor.tsx`
- Inside the existing `TabsContent value="hospital_visits"` (Admissions tab in self-service `care` section), wrap the existing `AdmissionsView` and a new `PatientIncidentHistory` in a nested `<Tabs>` with two triggers: **Hospital Admissions** and **Emergency Incidents**.
- Reuse the lazy `AdmissionsView` (passing `patient.id`) and `PatientIncidentHistory userId={patient.patient_user_id}`.
- Apply the standard teal `TabsList` + `data-[state=active]:bg-white data-[state=active]:text-black` styling.

### `src/components/layout/BottomNav.tsx`
- Remove the `Shield`/SOS tab from the patient nav `items` array; drop the `Shield` import.

### NEW `src/components/layout/SOSFab.tsx`
- Floating action button rendered globally for patients with HolarcHelp enabled.
- Position: `fixed bottom-20 right-4 z-50` (above the mobile bottom nav).
- Visual: 56px circular white button with a 2px red border, `Shield` icon in red, small red "SOS" label underneath. No ring, no green halo, no gradient.
- onClick → `navigate("/patient/holarchelp")`.
- Hidden when already on `/patient/holarchelp/*` or for non-patients.
- Mounted in the patient layout wrapper.

### `src/modules/holarchelp/pages/HolarcHelpHome.tsx`
Big rewrite of the action area:
- Delete "Share my location" and "Manage emergency contacts" buttons (and `shareLocation` helper). Keep "Find nearby provider" link.
- Replace the press-and-hold gesture with a single tap that:
  1. Calls `navigator.permissions.query({ name: 'geolocation' })`. If `denied`, render an amber help card with browser instructions to enable location and abort. Otherwise request `getCurrentPosition`.
  2. Creates the incident, then immediately renders an inline `<ProviderMap>` (reuse `src/modules/holarchelp/components/ProviderMap.tsx`) showing nearest hospitals + ambulances around the user's coords (sorted by haversine, top 10).
- **Patient-driven selection**: each marker and list row has a "Request this provider" action. Tapping it inserts a row into `holarchelp_incident_offers` with `response='accepted'` (patient-initiated) and updates the incident's `assigned_provider_id` + `accepted_at` for the chosen hospital/ambulance, immediately flipping the UI to the green "Help is on the way." state.
- **Provider-driven selection**: subscribe to realtime updates on `holarchelp_incidents` filtered to the active id. When `assigned_provider_id` becomes non-null OR `accepted_at` is set by any other actor, swap the map for the same green state.
- Green state UI: `bg-emerald-500 text-white` rounded-full pill with a `Shield` icon and label **"Help is on the way."** Tapping it routes to `/patient/holarchelp/incident/<id>` for live tracking.
- Severity picker still appears once after incident creation.

### Cleanup
- `PatientIncidentHistory` stays as-is (now used in the Admissions sub-tab and in `HolarcHelpProviderIncidents`).
- No DB migration required — `assigned_provider_id`, `accepted_at`, `holarchelp_incident_offers`, and realtime on `holarchelp_incidents` already exist.

---

## Technical notes

```text
Patient profile (MyDetails)
  - SOS / Nearby cards          → removed
  - PatientIncidentHistory      → removed (moved under Admissions)

My Holarchy → Admissions tab
  ┌──────────────────────────────────────────────┐
  │ [Hospital Admissions] [Emergency Incidents]  │
  ├──────────────────────────────────────────────┤
  │ AdmissionsView  /  PatientIncidentHistory    │
  └──────────────────────────────────────────────┘

Floating SOS FAB
  ○ red Shield icon, red "SOS" label (bottom-right, above bottom nav)

HolarcHelpHome on tap SOS
  - permission denied            → amber help card
  - permission ok                → create incident
                                 → show ProviderMap of nearest providers + list
  - patient taps "Request"       → assign provider, flip to green pill
  - provider accepts elsewhere   → realtime update flips to green pill
  - green pill                   → "Help is on the way."
```

Realtime subscription pattern:

```ts
supabase
  .channel(`incident-${id}`)
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'holarchelp_incidents', filter: `id=eq.${id}` },
    payload => {
      const row: any = payload.new;
      if (row.assigned_provider_id || row.accepted_at) setHelpOnTheWay(true);
    })
  .subscribe();
```

Patient-initiated selection writes:

```ts
await supabase.from('holarchelp_incidents').update({
  assigned_provider_id: provider.id,
  accepted_at: new Date().toISOString(),
}).eq('id', incidentId);
await supabase.from('holarchelp_incident_offers').insert({
  incident_id: incidentId,
  provider_id: provider.id,
  response: 'accepted',
  responded_at: new Date().toISOString(),
});
```
