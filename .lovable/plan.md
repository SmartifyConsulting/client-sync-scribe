## Goal

Move from "one login per ER / Hospital" to organizations with many individual staff logins, role-based permissions, paramedic-direct SOS, and per-paramedic GPS.

## How this maps to what already exists

The current schema already has most of the "Organization" model — we'll extend it instead of replacing it.

| Spec concept | Existing table / field |
|---|---|
| Organization (Hospital) | `holarchelp_hospitals` |
| Organization (ER Provider) | `holarchelp_ambulance_providers` |
| Hospital staff | `holarchelp_hospital_members` (`role` text) |
| ER staff | `holarchelp_ambulance_members` (`role` text) |
| Ambulance | new table `ambulances` (today's `ambulance_fleet` only stores type/count) |
| SOSIncident | `holarchelp_incidents` (add paramedic + ambulance FKs) |
| ResponderLocation | `holarchelp_provider_locations` (add `user_id` already present; switch writers to paramedic) |
| Invitations | existing `invite-provider-admin` edge function + member-table invite columns |

So no rename of tables. We add columns, extend the role vocabulary on member tables, and tighten dispatch + UI.

## Scope

### 1. Role vocabulary (no schema change to `user_role` enum yet)

Org membership granularity lives in the per-org member `role` text column, not in the global `user_role` enum. Allowed values:

- `holarchelp_hospital_members.role` ∈ `hospital_admin | doctor | nurse | coordinator`
- `holarchelp_ambulance_members.role` ∈ `er_admin | paramedic`

Global `user_role` stays as today (`patient`, `doctor`, `admin`, `hospital_staff`, `ambulance_staff`, …). `hospital_staff` / `ambulance_staff` continue to be the "you belong to at least one org" marker that powers route gating; the per-org `role` column drives in-org permissions.

Add helper SQL functions:
- `is_hospital_role(_hospital_id, _user_id, _role text) returns boolean`
- `is_ambulance_role(_provider_id, _user_id, _role text) returns boolean`
- `is_paramedic(_user_id)` → any membership with role `paramedic`
- Update existing `is_hospital_admin` / `is_ambulance_admin` to also accept the new role names (`hospital_admin`, `er_admin`).

### 2. New `ambulances` table

```
ambulances(
  id uuid pk,
  provider_id uuid → holarchelp_ambulance_providers,
  vehicle_code text,           -- e.g. "AMB-07"
  registration_number text,
  status text default 'available'  -- available|assigned|out_of_service
)
```

RLS: ER admins manage their own; paramedics in same org can read; platform admins manage all. Keep `ambulance_fleet` as-is (it's an aggregate count, different purpose).

### 3. Incident model additions

Add to `holarchelp_incidents`:
- `assigned_paramedic_user_id uuid`
- `assigned_ambulance_id uuid → ambulances`

`assigned_provider_id` stays (org-level audit trail). New flow sets all three on accept.

### 4. Dispatch flow: paramedic-direct

Update `supabase/functions/dispatch-sos`:
- Still find candidate ER providers within radius.
- For each candidate provider, expand to **online, on-shift paramedics** in `holarchelp_ambulance_members` and insert an offer row per paramedic (extend `holarchelp_incident_offers` with nullable `paramedic_user_id`).
- First paramedic to accept locks the incident: sets `assigned_provider_id`, `assigned_paramedic_user_id`, marks one of their org's available `ambulances` as assigned (or asks them to pick if >1).

New RPC `holarchelp_paramedic_accept(incident_id, ambulance_id)` replaces the org-level `holarchelp_accept_incident` for paramedics. Org-level accept kept for fallback / ER admin manual assign.

Notifications: when accepted, hospital staff at `destination_hospital_id` already get notified via existing `notify_hospital_inbound` trigger — no change.

### 5. Per-paramedic GPS

`useLiveProviderLocation` already writes `user_id` into `holarchelp_provider_locations`. Change:
- Activate the hook for any signed-in user whose `assigned_paramedic_user_id = auth.uid()` on an active incident (not just on the navigation route).
- Tick every 15 s (currently 10 s — keep 10 s, it's stricter than spec).
- Patient map `SosLiveMap` already subscribes to the same table — no change needed beyond reading the new paramedic id when present.

### 6. Block public org self-registration

- `src/pages/ProviderSignup.tsx`: replace public form with a "Hospitals and Emergency Response providers are onboarded by Holarc admins — contact us" panel. Keep the route, swap the body.
- Landing CTA: route "Register your service" to the contact panel.
- Admin already has `register-emergency-provider` edge function + UI; keep as the only creation path.

### 7. Invitations (extend existing)

Existing `invite-provider-admin` edge function supports email invite + token; member tables already have `invite_token` / `invite_expires_at` / `accepted_at`. Add:
- `invited_role` column on both member tables, defaulting to `paramedic` (ER) or `nurse` (hospital).
- "Invite staff" dialog in Admin hub for hospital admins and ER admins with role dropdown.
- Reuse `link_pending_provider_admin_invites` trigger — already links by email at signup.

### 8. Permissions enforcement

Rewrite or augment these RLS policies / RPCs to honor the granular roles:
- `holarchelp_paramedic_accept` — only paramedics in the offered provider.
- `holarchelp_set_incident_status` — only the assigned paramedic (today: any ambulance staff).
- Hospital ops dashboard SELECTs — `coordinator`, `nurse`, `doctor`, `hospital_admin` all read; only `hospital_admin` mutates settings.
- ER ops dashboard — `paramedic` reads own incidents; `er_admin` reads/mutates all.

### 9. UI surfaces

- **Admin hub → "Organizations"** tab (rename "HolarcHelp Providers"). Two sub-tabs: Hospitals, ER Providers. Each row → drawer with profile + Members + Ambulances.
- **ER Admin console**: existing `AdministratorsScreen` becomes "Team" with Paramedic vs ER Admin role chips; new "Fleet" tab listing `ambulances`.
- **Paramedic console**: existing `AmbulanceIncidentConsole` reskin — show only incidents where `assigned_paramedic_user_id = me OR I'm offered`.
- **Hospital console**: gate ER ops dashboard by role (`coordinator`/`nurse` see incoming; `hospital_admin` sees settings).

### 10. Data migration (no destructive changes)

- Each existing `holarchelp_hospitals.owner_id` → `holarchelp_hospital_members(role='hospital_admin', accepted_at=now())`.
- Each existing `holarchelp_ambulance_providers.owner_id` → `holarchelp_ambulance_members(role='er_admin', accepted_at=now())`.
- Existing members with `role='crew'` → `role='paramedic'`.
- Existing members with `role='admin'` → `role='er_admin'` (or `hospital_admin`).
- Existing incidents keep `assigned_provider_id`; `assigned_paramedic_user_id` stays null for historical rows.

## Out of scope (this pass)

- Multi-country / hospital-groups parent entities.
- Manual ER-admin reassignment UI (RPC will exist; UI later).
- Replacing the global `user_role` enum (would cascade through 30+ policies; not needed to unlock the feature).
- Renaming `holarchelp_ambulance_*` tables or `provider_kind: "ambulance"` strings — kept for API compat (per existing memory).

## Technical details

Files / functions touched:
- Migrations: new `ambulances` table; new columns on `holarchelp_incidents` and `holarchelp_incident_offers`; new helper SQL functions; updated RLS on member + incident tables; data backfill for owner→admin member rows.
- `supabase/functions/dispatch-sos/index.ts` — paramedic-level offers.
- New `supabase/functions/holarchelp-paramedic-accept` (or new RPC) + update `holarchelp_set_incident_status` SQL function.
- `src/modules/holarchelp/hooks/useLiveProviderLocation.ts` — gate on paramedic assignment, not URL.
- `src/modules/holarchelp/pages/provider/*` — Team/Fleet tabs, paramedic console filter.
- `src/pages/admin/HolarcHelpProviders.tsx` + new `OrganizationDrawer` with Members + Ambulances.
- `src/pages/ProviderSignup.tsx` — replace public form with contact panel.
- `src/components/InviteUserDialog.tsx` / new `InviteStaffDialog.tsx` — role dropdown.

## Open questions (please confirm before implementation)

1. **Scope checkpoint**: this is a multi-day refactor touching dispatch, RLS, and several pages. Want me to land it in one PR, or stage it: (a) schema + migrations, (b) dispatch + paramedic accept, (c) UI?
2. **Ambulance assignment on accept**: if a paramedic owns / drives multiple ambulances, should the accept dialog force them to pick one, or auto-pick the first `available`?
3. **Eldette 911**: she's currently an `ambulance_member` with role `crew`. OK to migrate her to `paramedic` and make her the test user for the new flow?
