

# Remove Home Nav, Add Dashboard to Profile, Implement Per-Section Editing

## Summary
Remove "Home" from bottom nav (all layouts), merge dashboard elements (welcome banner, quick actions, upcoming appointments) into the Profile view on mobile, and implement per-section inline editing with pencil/save/cancel icons on each collapsible section header.

## Changes

### 1. Remove "Home" from bottom navigation
**File:** `src/components/layout/BottomNav.tsx`
- **Patient**: Remove `{ icon: LayoutDashboard, label: "Home", section: "home" }` from `patientSections` array
- **Doctor**: Remove `{ icon: LayoutDashboard, label: "Home", to: "/dashboard" }` from `doctorNavItems` array
- Update default section fallback from `"profile"` to `"health"` (line 76)

### 2. Merge Dashboard elements into Profile/Health section on mobile
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- When mobile patient lands on `section=health`, show the `ProfileBanner` (already exists) + Quick Actions (Calendar button, Record Task button) + Upcoming Appointments summary **above** the Personal/Medical sub-tabs
- Move the `ProfileBanner` render to always show at the top of the health section on mobile (currently it renders once outside tabs — keep it there but add Quick Actions row below it)
- Add a "Quick Actions" row with Calendar and Record Task buttons (matching the screenshot) below the profile banner, before the tab content
- Remove `dashboard` from `SECTION_TABS.home` and the `home` section entirely since Home bottom nav is gone

### 3. Implement per-section inline editing with pencil/save/cancel
**File:** `src/components/patients/PatientDetailsEditor.tsx`

This is the core fix. Currently there are two separate render blocks (VIEW MODE line 1271, EDIT MODE line 1779) and no way to enter edit mode.

**Approach**: Merge view and edit into a single render. Add `editingSections` state map. Update `SectionHeader` to accept editing props.

- Add state: `const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});`
- Remove the global `isEditing` state and the `if (!isEditing)` branch — merge into one unified render
- Update `SectionHeader` component to accept: `sectionKey`, `isEditing`, `hasChanges`, `onEdit`, `onSave`, `onCancel`
  - Show Pencil icon when not editing (visible when section is expanded)
  - Show Check (save) and X (cancel) icons when editing and changes exist
- Each collapsible section renders either `ViewField` components or form `Input` components based on `editingSections[sectionKey]`
- `onSave` calls `saveChanges()` for that section then sets `editingSections[key] = false`
- `onCancel` reverts form data for that section and sets `editingSections[key] = false`
- Delete the entire EDIT MODE block (lines 1779-3271) — all edit fields will be inline within the single unified render

### 4. Remove "Dashboard" tab from mobile section mapping
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Remove `home: ["dashboard"]` from `SECTION_TABS`
- Keep the `TabsContent value="dashboard"` for desktop/tablet only (when not filtered by mobile section)

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Remove "Home" from both doctor and patient nav arrays |
| `src/components/patients/PatientDetailsEditor.tsx` | Remove global edit/view bifurcation; implement `editingSections` state; update `SectionHeader` with pencil/save/cancel; merge dashboard elements into health section on mobile; remove `home` section mapping |

