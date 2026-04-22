

# Plan: Merge Home into My Profile, restructure tabs, sync mobile/web

## 1. Drop "Home" from navigation, keep its banner inside My Profile

The Home page only shows the greeting banner (`ProfileBanner`) — no unique content. Merge it into My Profile so the greeting is preserved, then remove the "Home" entry everywhere.

**`src/components/layout/BottomNav.tsx`** — patient bottom nav becomes 4 items:

```tsx
const patientSections = [
  { icon: User,       label: "My Profile",  section: "health", to: "/patient/details?section=health" },
  { icon: Handshake,  label: "My Holarchy", section: "care",   to: "/patient/details?section=care" },
  { icon: FolderOpen, label: "My Desk",     section: "admin",  to: "/patient/details?section=admin" },
  { icon: Gift,       label: "My Rewards",  section: "rewards",to: "/patient/rewards" },
];
```

**`src/components/layout/Sidebar.tsx`** — `patientNavItems` mirrors the same 4 entries (no Home).

**`src/pages/patient/MyDetails.tsx`** — default section becomes `"health"` (already is); add a redirect: if `section === "home"`, redirect to `?section=health`. Drop the `home` heading entry.

## 2. My Profile shows the greeting banner on every device

**`src/components/patients/PatientDetailsEditor.tsx`**

- `SECTION_TABS.health` stays `["personal", "medical"]`. Remove the `home` key.
- Update banner gating (lines 1428–1430) so the **full `ProfileBanner` (greeting + appointments + Vula counter + action buttons) renders at the top of the `health` section on every viewport**:
  ```ts
  const showFullBanner = section === "health";       // greeting always sits above My Profile
  const showCompactBanner = false;                    // compact banner no longer needed
  const showTabs = true;
  ```
- The banner action buttons ("Calendar" / "Record Task") keep their existing behavior (jump to My Desk).
- `CompactBanner` becomes dead code; leave the function in place but it never renders (no risk, easy to remove later).

## 3. Tab restructure on tablet/web (and sync to mobile)

Currently the self-service tablet/web layout flattens **all** tabs (Personal, Medical, My Holarchy, Sessions, Admissions, Calendar, Tasks, Documents, Round Table) into one strip (lines 1281–1327). Restructure so the tab strip matches the section the user is in — same as mobile.

**Update `SECTION_TABS`:**
```ts
const SECTION_TABS = {
  health: ["personal", "medical"],                        // My Profile
  care:   ["doctors", "sessions", "hospital_visits", "roundtable"], // My Holarchy
  admin:  ["calendar", "tasks", "documents"],             // My Desk
};
```
(`care` already contains the four required tabs: Holarchy/Sessions/Admissions/Round Table — just relabel `hospital_visits` trigger as "Admissions" which is already done.)

**`renderTabsList` (lines 1215–1328):**
- Replace the dual mobile/desktop branches with a **single self-service branch** that filters by `SECTION_TABS[section]` regardless of viewport. Result:
  - On `/patient/details?section=health` → tabs = [Personal Information, Medical Information]
  - On `?section=care` → tabs = [My Holarchy, Sessions, Admissions, Round Table]
  - On `?section=admin` → tabs = [My Calendar, My Tasks, My Documents]
- Web and mobile now show the same tab set per section ("sync the website tabs with the mobile tabs").
- The grouped/parent-tab branch (used for doctor-viewing-patient, lines 1330–1359) is unchanged.

**`getInitialTab` / sync `useEffect` (lines 369–381):** apply on every viewport (drop the `isMobile` guard) so the default selected tab matches the current section on tablet/web too.

## 4. Visual outcome per device

| Device | Section | What you see |
|---|---|---|
| Mobile | `health` (My Profile) | Greeting banner + Personal / Medical tabs |
| Mobile | `care` (My Holarchy) | Compact-free → just the 4 Holarchy tabs |
| Mobile | `admin` (My Desk) | Calendar / Tasks / Documents tabs |
| Tablet/Web | `health` | Sidebar shows 4 items; page shows greeting banner + Personal / Medical tabs |
| Tablet/Web | `care` | Holarchy / Sessions / Admissions / Round Table tabs |
| Tablet/Web | `admin` | Calendar / Tasks / Documents tabs |

## Files touched

| File | Change |
|---|---|
| `src/components/layout/BottomNav.tsx` | Remove "Home" item; 4-item patient nav (Profile / Holarchy / Desk / Rewards) |
| `src/components/layout/Sidebar.tsx` | Same 4-item patient nav (no Home) |
| `src/pages/patient/MyDetails.tsx` | Default section → `health`; redirect `?section=home` → `?section=health`; drop `home` heading |
| `src/components/patients/PatientDetailsEditor.tsx` | Remove `home` from `SECTION_TABS`; render `ProfileBanner` at top of `health` on all devices; collapse `renderTabsList` to one self-service branch filtered by `SECTION_TABS[section]`; drop `isMobile` guard from initial-tab logic |

## Out of scope
- Doctor sidebar (unchanged — doctor still has Home).
- My Rewards page (unchanged).
- The grouped tabs used when a doctor views a patient record (unchanged).

