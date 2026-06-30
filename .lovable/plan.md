# Admin restructure, Fleet Admin, Crew assignments, multi-ambulance Start shift & nav cleanup

## Why
Today the **Start shift** dialog assumes one paramedic + one ambulance. You want a real ER provider flow: many ambulances roll out at once, each with its own crew. Crew lives nowhere obvious, the fleet has no single owner screen, affiliated hospitals are scattered, and the ambulance nav has redundant screens that force dispatchers to toggle between related views. This plan consolidates everything.

## Rename & restructure: User Admin → Admin
`User Admin` is renamed to **Admin** in the sidebar and page header. It becomes one screen with four sub-tabs (teal Tabs style used elsewhere):

```text
Admin
 ├─ Users          (existing administrators/users list)
 ├─ Fleet Admin    (NEW — vehicles)
 ├─ Crew           (NEW — people, with vehicle assignments)
 └─ Hospitals      (NEW — affiliated hospitals linked to this provider)
```

### Users tab
- Existing administrators list. Phone + email columns already added.

### Fleet Admin tab
- Lists every vehicle in `ambulances` for the provider: code, registration, type, status (Available / On shift / Out of service), default base, "Assigned crew (n)".
- Actions: **Add vehicle**, Edit, Set status, Decommission.
- Row click opens a side panel with crew currently assigned to that vehicle (read-only mirror of the Crew tab).
- Replaces the standalone Fleet Operations vehicle CRUD inside the Ambulance portal (live ops view stays).

### Crew tab
- Lists every `holarchelp_ambulance_members` row for the provider: name, email, phone, role (Paramedic / EMT / Driver / Lead), status, **Assigned vehicle(s)**.
- Each row has a multi-select **Assign to vehicle(s)** dropdown — writes to a new `ambulance_crew_assignments` table (many-to-many: crew member ↔ ambulance, with `is_default_lead`).
- Actions: **Invite crew member**, Edit, Deactivate.
- Single answer to "where do I list crew members".

### Hospitals tab
- Lists hospitals this provider is affiliated to / administers (`ambulance_hospital_affiliations` joined to `holarchelp_hospitals`): name, address, affiliation type (Primary destination / Backup / Administered), status, contact.
- Actions: **Add affiliation** (search existing hospital and link), Edit affiliation type, Remove.
- Drives downstream behaviour: only affiliated + currently-accepting hospitals appear in the destination picker on paramedic accept.

## Nav cleanup (ambulance portal)

Remove redundant items now that the data lives in better homes:

```text
BEFORE                        AFTER
─────────────────────────     ─────────────────────────
Emergency Dashboard            Emergency Dashboard  (← Incoming SOS merged in)
Incoming SOS         ✖ remove
Active Mission                 Active Mission
Fleet Live                     Fleet Live
Dispatcher Console             Dispatcher Console
Shift Teams          ✖ remove
Telematics                     Telematics
Admin                          Admin
```

### Emergency Dashboard + Incoming SOS merged
- The **Incoming SOS** list (open offers/pending incidents queue) becomes the top section of the Emergency Dashboard, above existing KPI cards and Active Mission summary.
- One screen, one source of truth for "what's happening right now": live SOS queue → accept/dispatch inline → KPI strip → currently-rolling shifts.
- Standalone `IncomingSosScreen` route + sidebar entry deleted; any deep links redirect to `/provider/ambulance/dashboard`.

### Shift Teams removed
- Redundant once Crew + Fleet Admin own the roster and the Emergency Dashboard shows rolling shifts.
- `TeamStatusScreen` route + sidebar entry deleted. The "currently on shift" view becomes a compact accordion on the Emergency Dashboard so dispatchers still see who's out without an extra click.

## Start shift — multi-ambulance, pre-filled crew
Rebuild `StartShiftDialog.tsx`:

```text
Start shift
─────────────────────────────────────────────
Select ambulances going on shift now
[x] RA-01 · CA 123 GP
      Lead:  [ Sipho M (default) ▼ ]
      Crew:  [x] Thandi K (Driver)
             [x] Jacob P (EMT)
[x] RA-02 · CA 456 GP
      Lead:  [ Select paramedic ▼ ]
      Crew:  [ ] ...
[ ] RA-03 · CA 789 GP
─────────────────────────────────────────────
                              [Cancel] [Start 2 shifts]
```

- Only `available` vehicles with no open shift are listed.
- Ticking a vehicle auto-fills Lead + Crew from `ambulance_crew_assignments`; user can override.
- A crew member ticked on another vehicle is greyed out with "already on RA-01" — no double-booking.
- Submit calls new RPC `holarchelp_start_shifts_bulk(_payload jsonb)` — one transaction, one `paramedic_shifts` row per ambulance plus matching `paramedic_shift_partners` rows; all-or-nothing.
- Toast: "Started 2 shifts · 5 crew members on duty".

## Technical notes
- New table `public.ambulance_crew_assignments(ambulance_id, member_id, is_default_lead, created_at)`, unique `(ambulance_id, member_id)`, RLS scoped to provider admins; GRANT `authenticated` + `service_role`.
- New RPC `holarchelp_start_shifts_bulk(_payload jsonb)` (`security definer`): validates provider ownership, vehicle availability, no open shift for each lead, bulk inserts shifts + partners.
- `AdministratorsScreen.tsx` renamed to **Admin**, wrapped in shadcn `Tabs` (Users | Fleet Admin | Crew | Hospitals). Sidebar label + i18n keys updated.
- Hospitals tab reuses `ambulance_hospital_affiliations`; no new table.
- `StartShiftDialog.tsx` rewritten around `selections: { ambulance_id, lead_user_id, partner_user_ids[] }[]` with assignment defaults.
- `EmergencyDashboardScreen.tsx` gains an "Incoming SOS" section at the top and a "Rolling shifts" accordion at the bottom. `IncomingSosScreen` and `TeamStatusScreen` routes deleted; sidebar (`AmbulanceOpsLayout`) trimmed.
- No changes to incident acceptance, billing, or pricing logic.
