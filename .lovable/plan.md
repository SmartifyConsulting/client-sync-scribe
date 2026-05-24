## Issues found

### 1. "Record Task" on My Holarchive does nothing for patients
The button in `src/pages/patient/PatientDashboard.tsx` links to `/todos?autoRecord=true`, which renders the **doctor's** `TodoList` page. That page calls `process-todo-actions` in doctor mode (looks up `patients` where `user_id = auth.uid()` — empty for a patient), then writes a row to `todos` with `user_id = patient's auth id` and `patient_id = null`. Nothing appears on `/patient/tasks` (it filters `todos` by `patient_id IN (their patient record ids)`), so the patient never sees what they recorded.

### 2. SOS — wrong destination hospital + wrong roles on the map
Checked incident `6eb2c86b-…`: `destination_hospital_id` is NULL, `assigned_provider_id = Netcare Olivedale Hospital`. `SosLiveMap` falls through to "auto-pick nearest approved hospital", which from the patient's location resolves to **Netcare Rosebank** (~4.6 km vs Olivedale ~7 km). Beyond that, the SOS flow incorrectly lets the **patient** pick the destination hospital and renders generic hospital pins — it should be the **ER provider** (ambulance) that picks the destination, and the map should clearly distinguish responder (red ambulance) from destination (red hospital with cross).

## Plan

### A. Patient Record Task button → patient-aware flow

1. `src/pages/patient/PatientDashboard.tsx` — change the Record Task `<Link to="/todos?autoRecord=true">` to `/patient/tasks?autoRecord=true`.
2. `src/pages/patient/PatientTasks.tsx` — add an `autoRecord` query-param effect (mirroring `TodoList`) that triggers the existing `startTaskRecording` on mount and clears the param. The patient's recorder already writes a `todos` row tied to their `patient_id`, so it shows up in PatientTasks immediately.

### B. SOS — auto-pick ER provider only, ER provider picks destination

1. `src/modules/holarchelp/components/SosLiveMap.tsx`:
   - **Remove the auto-pick-nearest-hospital fallback entirely.** The map must never invent a destination hospital.
   - **Auto-pick nearest available ER provider** (ambulance) when no `assigned_provider_id` is set: query `holarchelp_ambulance_providers` where `status='approved'`, `subscription_status='active'`, `accepting_patients=true`, sort by haversine from patient location, and surface the nearest one as the responder pin (no DB write — purely visual until dispatch confirms).
   - **Destination hospital marker** only renders when `destination_hospital_id` is explicitly set (by the ER provider). Until then, show the responder pin + patient pin and the phase stays "selecting".
   - **Marker styling:**
     - **Responder (ER provider):** red ambulance vehicle icon (use Lucide `Ambulance` with `text-destructive`, white circular background, red border).
     - **Destination hospital:** red marker with a white cross on red background (Lucide `Plus` over a red square/circle, or `Hospital` icon rendered in `text-destructive`). Use design tokens (`hsl(var(--destructive))`) — no hard-coded colors.

2. `src/modules/holarchelp/components/HospitalPicker.tsx`:
   - **Restrict to ER providers, not patients.** Hide/disable the picker entirely for patients on the incident detail page. The component already mounts inside `AmbulanceIncidentConsole` and `NavigationScreen` (ER provider screens) — keep it there.
   - Remove the patient-facing entry point in `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` (or equivalent) that currently renders `HospitalPicker` for the SOS user.
   - In the picker itself: after `update({ destination_hospital_id })`, read the row back (`.select("destination_hospital_id").single()`) and only toast success when the persisted value matches the picked id; surface explicit error otherwise.

3. **Patient-side incident view** simply observes: it shows the patient pin, the auto-picked or assigned ER provider (red ambulance), and once the ER provider picks a destination, the red-cross hospital marker + route polyline appear.

### Files to change

- `src/pages/patient/PatientDashboard.tsx` — re-target Record Task link.
- `src/pages/patient/PatientTasks.tsx` — add `autoRecord` query-param trigger.
- `src/modules/holarchelp/components/SosLiveMap.tsx` — remove hospital auto-pick, add ER-provider auto-pick, restyle responder + destination markers (red ambulance / red-cross hospital).
- `src/modules/holarchelp/components/HospitalPicker.tsx` — verify write, surface failures.
- `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` (and any patient-side caller) — remove patient-facing `HospitalPicker` entry; destination selection is ER-provider-only.

No database or edge-function changes required.