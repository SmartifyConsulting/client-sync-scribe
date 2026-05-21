# Paramedic Shift + Availability Sync — Plan

Goal: implement the missing pieces so the SOS workflow matches the spec end-to-end, with paramedic and ambulance statuses kept in lockstep during an active incident.

## 1. Database (single migration)

### 1a. New table `paramedic_shifts`
Tracks a paramedic's on-duty session and the ambulance they're operating.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | the paramedic |
| `provider_id` | uuid → `holarchelp_ambulance_providers` | |
| `ambulance_id` | uuid → `ambulances` | the rig they picked at Start Shift |
| `status` | text | `available` \| `busy` \| `off_shift` (check constraint) |
| `current_incident_id` | uuid nullable | set when busy |
| `started_at`, `ended_at`, `updated_at`, `created_at` | timestamptz | |

- Unique partial index: one open shift per paramedic (`WHERE ended_at IS NULL`).
- RLS: paramedic can read/update own shift; ER admins of the provider can read all; platform admin full.

### 1b. RPCs
- `holarchelp_start_shift(_ambulance_id uuid)` — verifies caller is a `paramedic` member of the ambulance's provider, ambulance is `available`, no existing open shift; inserts shift with `status='available'`, flips ambulance to `assigned`-equivalent? No — keep ambulance `available` at shift start so dispatcher can still see it; ambulance only flips to `assigned` when an incident is accepted. (Confirms your example table: paramedic Available, ambulance Available → both Busy on accept.)
- `holarchelp_end_shift()` — only allowed if `status != 'busy'`; sets `ended_at`, ambulance back to `available` if previously linked.
- Update existing `holarchelp_paramedic_accept`:
  - Require caller to have an **open shift** whose `ambulance_id` matches `_ambulance_id` (no more per-incident vehicle selection).
  - Set `paramedic_shifts.status='busy'`, `current_incident_id=_incident_id`.
  - Continue to set `ambulances.status='assigned'`.
- New `holarchelp_release_incident(_incident_id uuid)` triggered when incident reaches a terminal state (`completed`, `cancelled`, `resolved`):
  - Flip `paramedic_shifts.status='available'`, clear `current_incident_id`.
  - Flip `ambulances.status='available'`.
  - Idempotent; also called by a trigger on `holarchelp_incidents` status transitions so any path (hospital handover, cancel) syncs both entities.

### 1c. Trigger
`AFTER UPDATE ON holarchelp_incidents` — when `status` changes into a terminal state and there is an `assigned_paramedic_user_id`, call the release RPC body inline.

## 2. Edge function `dispatch-sos`

Replace the "expand each ER candidate to its paramedics" block: query only paramedics with an **open shift** where `status='available'`. Use `paramedic_shifts` joined to `holarchelp_ambulance_members` (or just to `ambulances` for `provider_id`).
Result: off-shift or busy paramedics are no longer offered new incidents.

## 3. Frontend

### 3a. New shift controller (replaces the localStorage toggle)
- `useParamedicShift()` hook — reads/subscribes to the caller's open shift row; exposes `{ shift, startShift(ambulanceId), endShift(), setAvailable(), setBusy() }`.
- `StartShiftDialog` — lists the org's `available` ambulances, paramedic picks one, calls `holarchelp_start_shift`.
- Replace the "On shift / Off shift" pill in `AmbulanceOpsLayout` with a real button driven by the hook (with badge showing the bound vehicle code and live `available / busy` status).
- `TeamStatusScreen`: drop the localStorage `SHIFT_KEY` map; instead read all open shifts for the provider (ER admin view) and show paramedic ↔ ambulance ↔ status.

### 3b. `ParamedicAcceptDialog` simplification
- Remove the ambulance picker. Read the active shift's `ambulance_id` and show it as a read-only confirmation card ("Responding with ER24-12"). If no open shift → block accept and prompt "Start your shift first".
- Call `holarchelp_paramedic_accept(_incident_id, shift.ambulance_id)`.

### 3c. `IncomingSosScreen` gating
- Hide the screen contents (or show "You are off shift") when there is no open shift.
- Hide it when `shift.status === 'busy'` to enforce "no new SOS while on an active incident".

### 3d. Incident completion UI
- Wherever a paramedic marks an incident complete/handover/cancel (e.g. `AmbulanceIncidentConsole` / `NavigationScreen`), no client change needed beyond surfacing a success toast — the DB trigger handles the release. Verify the existing complete buttons set `status` to a terminal value.

## 4. Out of scope
- No changes to hospital flows, payments, or organisation admin UI.
- No new map/ETA logic — ETA already updates from `provider_*` columns.
- No multi-shift / handover-mid-incident logic.

## 5. Acceptance checklist
- [ ] Paramedic cannot accept an SOS without an open shift.
- [ ] Starting a shift requires picking an available ambulance.
- [ ] Off-shift paramedics receive **no** `sos_incoming` notifications.
- [ ] Accepting an SOS flips paramedic → `busy` AND ambulance → `assigned` in one transaction.
- [ ] Busy paramedics do not appear in `dispatch-sos` candidate set.
- [ ] Completing/cancelling an incident flips paramedic → `available` AND ambulance → `available`.
- [ ] `TeamStatusScreen` reflects all of the above in realtime (no localStorage).
