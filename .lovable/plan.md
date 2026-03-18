

# UI Consistency & Patient Experience Fixes

## Issues Identified

1. **Auth page**: Logo too small (`h-[62px]`), black "Holarc" text should be removed
2. **Teal text legibility**: `--primary: 172 66% 50%` is too light for text. Need darker teal for text usage
3. **Patient dashboard buttons inconsistent**: Bell/avatar use `bg-secondary` while doctor dashboard uses `bg-terracotta` round buttons with Mic icon
4. **My Doctors page**: Specialty badge not showing — query fetches `specialty` and code renders it, but the `role` filter `.eq("role", "doctor")` in search may not match; the connected doctors list should work. Need to verify the `doctor_patient_access` query returns profiles with specialty.
5. **Patient dashboard Healthcare Providers**: Already shows specialty badge (line 517) — should be working
6. **Column headings wrapping**: Need `whitespace-nowrap` globally on table headers
7. **Assigned Tasks + Chronic status on patient dashboard**: Already implemented (lines 329-436)

## Plan

### 1. Darken teal for text legibility (`src/index.css`)

Change `--primary` from `172 66% 50%` to `172 66% 40%` (darker). Adjust `--primary-glow` accordingly. This affects all `text-primary` usage globally. Also darken `--accent-foreground` for better contrast.

### 2. Auth page logo & text (`src/pages/Auth.tsx`)

- Increase logo from `h-[62px]` to `h-[90px]` on both login and signup views (lines 822, 868)
- Remove the `<h1>Holarc</h1>` black text on both views (lines 824, 870)

### 3. Patient dashboard button consistency (`src/pages/patient/PatientDashboard.tsx`)

Replace the bell button styling from `bg-secondary` to `bg-terracotta` (matching doctor dashboard). Add a Mic "Record a Task" shortcut button if patients have tasks. Ensure both dashboards use identical round terracotta icon buttons.

### 4. Global table header no-wrap (already in memory but enforce)

Add a global CSS rule in `src/index.css`: `th, [role="columnheader"] { white-space: nowrap; }` to prevent any table header from wrapping to two rows.

### 5. My Doctors specialty badge fix (`src/pages/patient/MyDoctors.tsx`)

The connected doctors query (line 55-57) correctly selects `specialty` from profiles. The `DoctorCard` component (line 111) renders the badge when `doctor.specialty` exists. The issue is likely that the profile query uses `.in("id", doctorIds)` which should work. However, the `doctor_patient_access` table stores `doctor_id` which maps to `profiles.id`. This should work — the bug may be that doctors simply don't have `specialty` set in their profile. No code change needed here unless the query is wrong.

Actually, looking more carefully: the `handleSearch` function (line 79) filters by `.eq("role", "doctor")` but connected doctors don't filter by role — they query by ID directly. The connected doctors path should work. Will leave as-is since the data flow is correct.

### 6. Compact, minimalist global adjustments (`src/index.css`)

- Reduce default padding on cards slightly
- Ensure `whitespace-nowrap` on all table headers via CSS

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Darken primary teal (40% lightness); add global `th { whitespace-nowrap }` |
| `src/pages/Auth.tsx` | Enlarge logo to `h-[90px]`; remove "Holarc" black h1 text |
| `src/pages/patient/PatientDashboard.tsx` | Match bell/avatar buttons to terracotta style from doctor dashboard |

