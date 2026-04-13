

# Merge Dashboard Into Profile Banner — All Views

## Summary
Eliminate the dedicated "Dashboard" tab by embedding its key content (upcoming appointments, Vulas count, Calendar icon, Record Task button) directly into the ProfileBanner section that appears above all tabs. This applies to mobile, tablet, and web views.

## Changes

### 1. Expand ProfileBanner with dashboard content
**File:** `src/components/patients/PatientDetailsEditor.tsx`

The `ProfileBanner` component (line 1008-1071) currently shows greeting + avatar + email + Vulas counter. Expand it to also include:

- **Calendar + Record Task buttons** — placed next to / below the greeting (responsive layout)
- **Upcoming Appointments mini-list** — a compact card showing next appointments fetched from `appointments` table, displayed below the greeting row
- **Vulas count** — already present, keep as-is

The banner will need to fetch upcoming appointments data internally (query `appointments` table for the patient's upcoming slots via `doctor_patient_access`). Import `Calendar`, `Mic`, `Clock` from lucide-react, `Link` from react-router-dom, `useQuery` from tanstack, `supabase` client, and `format`/`parseISO`/`isFuture` from date-fns.

Layout structure:
```text
┌─────────────────────────────────────────────────┐
│ [Avatar]  Welcome back              [Calendar] │
│           Patient Name              [Record]   │
│           email@holarc.health                  │
│           You have earned X Vulas              │
│                                                │
│  ┌─ Upcoming Appointments ──────────────────┐  │
│  │ Dr. Name — Apr 15, 2:00 PM  [Specialty]  │  │
│  │ Dr. Name — Apr 18, 10:00 AM [Specialty]  │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2. Remove "Dashboard" tab from tab navigation
**File:** `src/components/patients/PatientDetailsEditor.tsx`

- Remove `"dashboard"` from `SECTION_TABS.home` (line 309) — change to empty array or remove the `home` key
- Remove the Dashboard `TabsTrigger` from both mobile (line 1117-1120) and desktop (line 1170-1173) tab lists
- Remove the Dashboard `TabsContent` from both view mode (line 1656-1669) and edit mode (line 3148-3160)
- Remove the lazy import of `PatientDashboardLazy` if no longer needed

### 3. Update mobile bottom nav default
**File:** `src/components/layout/BottomNav.tsx` and `src/pages/patient/MyDetails.tsx`

- Since there's no more "dashboard" tab, the `home` section should default to `"personal"` (the first tab of the profile group)
- Update `SECTION_TABS` mapping: `home: ["personal", "medical"]` (same as `health`)
- Or remove the `home` section entirely and default to `health`

### 4. Remove or keep PatientDashboard.tsx
**File:** `src/pages/patient/PatientDashboard.tsx`

This file can remain for now (it may be referenced elsewhere), but it will no longer be rendered inside the tab. The appointment-fetching logic will be duplicated in a lightweight form inside ProfileBanner.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/patients/PatientDetailsEditor.tsx` | Expand ProfileBanner with appointments + action buttons, remove Dashboard tab from navigation and content |
| `src/components/layout/BottomNav.tsx` | Update default section mapping since dashboard tab is gone |
| `src/pages/patient/MyDetails.tsx` | Update default section to match new tab structure |

