## 1. Make language selection actually translate the UI everywhere

**Problem:** `LanguageSwitcher` updates `i18n.language` + persists to `profiles.preferred_language`, but most components render hardcoded English strings. So switching to FR for Renken only updates the few wired labels — everything else stays English.

**Approach:**
- Replace hardcoded strings with `t("...")` across high-traffic surfaces:
  - `ProviderSidebar` (all nav items: Telematics, Team, Fleet, Dashboard, User Admin, etc.)
  - `TopBarIcons` tooltips
  - `AmbulanceOpsDashboard`, `TelematicsScreen`, `TeamStatusScreen`, `NavigationScreen`, `IncomingAmbulancesScreen`, `HospitalOpsDashboard`, `AmbulanceOpsLayout` page titles, tab labels, button labels, table headers, status badges, empty states.
  - Common shared shells (page headers, "Loading…", "No data", Save/Cancel/Add).
- Add new keys to every locale JSON under `nav.*`, `telematics.*`, `team.*`, `fleet.*`, `userAdmin.*`, `crew.*`, `common.*`. English source of truth; other locales translated.
- Fix the persistence reload path: on login/profile switch, read `profiles.preferred_language` and call `i18n.changeLanguage(...)` before provider routes render, so Renken's selection sticks across sessions and profiles.
- `LanguageSwitcher` already writes both `localStorage["app.language"]` and `profiles.preferred_language`; confirm reactivity via `i18n.on("languageChanged")`.

## 2. Rename "Administrators" → "User Admin" and manage Crew Members there

- Rename the existing `/provider/ambulance/admins` route's label, page heading, and breadcrumbs from "Administrators" to **"User Admin"** (driven by `t("nav.userAdmin")`). Keep the URL stable to avoid breaking links.
- Restructure the User Admin page as a tabbed screen:
  - **Tab 1 — Admins** (existing list of provider admin users).
  - **Tab 2 — Crew Members** (new — replaces the standalone screen idea).
- Do NOT add a separate `/provider/ambulance/crew` sidebar entry. Crew management lives inside User Admin.

**Crew Members tab features** (backed by `holarchelp_ambulance_members`):
- Table: avatar initial, full name, role badge (Paramedic / EMT / Driver / Dispatcher), phone, email, status.
- "Add Crew Member" dialog: name, role dropdown, phone (uses existing `PhoneNumberInput` with country dial codes), email, optional shift pattern. Insert scoped to current provider.
- Inline edit, deactivate (soft delete via `status='inactive'`).
- Search box + role filter.
- All labels via `t()`.

## 3. Show crew member names on telematics

- `TelematicsScreen` currently shows trips/stops by ambulance plate only.
- Add columns to `holarchelp_telematics_trips`: `driver_member_id uuid`, `attendant_member_id uuid` (nullable FKs to `holarchelp_ambulance_members.id`).
- Trip query joins members → display "Driver: Jane Doe · Attendant: John K." on each trip card.
- Live Fleet view shows currently-assigned crew per ambulance.

## 4. Much more telematics demo data for Renken

- **8–10 additional historical trips** over the last 14 days across all 6 ambulances, with realistic Johannesburg routes (Sandton ↔ Mediclinic, Bryanston ↔ Netcare Olivedale, Fourways ↔ Life Fourways, Morningside ↔ Sunninghill, etc.).
- **3–5 stops per trip** (dispatch, on-scene, hospital handover, refuel, base return) with realistic dwell times (2–25 min).
- **15–25 GPS pings per trip** so the map shows route lines, not dots.
- **12 named crew members** seeded in `holarchelp_ambulance_members` and assigned across trips so names render.
- Mix of statuses: completed, in_progress, dispatched.

## Technical notes

- Sidebar nav key renamed: `nav.administrators` → `nav.userAdmin` across all locale JSONs.
- Migration adds the two new trip columns; RLS unchanged (provider-scoped).
- Crew form reuses `PhoneNumberInput`.
- Language reload hooked into the existing profile bootstrap (`useUserRole` / profile fetch) — no new global provider.
- Locale JSON additions are append-only.

## Out of scope

- Full HR/scheduling system — just CRUD on crew + trip assignment.
- Translating long-form document templates and AI-generated text — UI chrome only.
