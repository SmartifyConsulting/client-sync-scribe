

# Navigation, ICE Removal, Tab Reordering & Header Cleanup

## Summary
Move upcoming appointments to top of calendar, remove ICE from DB and all layouts, delete NOK & ICE tab, move NOK under Medical Insurance, remove Share from section headers (keep on records), rename email label, reorder Round Table to last, and remove duplicate headers in tab content.

## Changes

### 1. Calendar: Move Upcoming Appointments to top
**File:** `src/pages/patient/PatientCalendar.tsx`
- Move the "Upcoming" `<Card>` (lines 394-422) from after the calendar grid to before it — place it right after `<PatientRequestsBadge />` and before the grid div
- Make it compact: show as a horizontal scrollable row or a small collapsible card (not a full sidebar)
- Show on all screen sizes (remove `hidden lg:block`)

### 2. Remove ICE field from database
- Create a migration to drop the `ice_contacts` column from the `patients` table

### 3. Remove ICE from all layouts
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- **View mode**: Remove the entire ICE Contacts collapsible section (lines ~982-1020)
- **Edit mode**: Remove the entire ICE Contacts collapsible section (lines ~1467-1521)
- Remove ICE-related state variables (`iceContacts`, `showAddICE`, `newICE`, `editingICEId`)
- Remove ICE-related handler functions (`handleAddICE`, `handleEditICE`, `handleShareICE`, `handleICEAsNOK`)
- Remove `ICEContact` from imports
- Clean up the `handleShareRecord` function to remove `'ice'` case

### 4. Delete NOK & ICE tab from all layouts
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Remove `nok-iced` from `SECTION_TABS.health`: change to `health: ["personal", "medical"]`
- Remove the `TabsTrigger value="nok-iced"` from mobile tab list (line 838)
- Remove the `TabsTrigger value="nok-iced"` from desktop sub-tabs (line 883)
- Remove `PROFILE_TABS` entry: change from `["personal", "medical", "nok-iced"]` to `["personal", "medical"]`
- Remove the `TabsContent value="nok-iced"` block (lines 1336-1344)
- Remove the `NokIcedTab` lazy import

### 5. Move NOK section to Medical Information tab (under Medical Insurance)
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- **View mode**: Move the NOK collapsible section (lines ~948-980) from Personal tab into Medical tab Column 2, placed after Medical Insurance section
- **Edit mode**: Move the NOK collapsible section (lines ~1409-1465) similarly to Medical tab Column 2, after Medical Insurance

### 6. Remove Share icon from ICE section header (already being removed with ICE)
- The ICE section header had a Share button on the CollapsibleTrigger — this is moot since ICE is being removed entirely
- Verify NOK section header uses `SectionHeader` component (no Share on header) — share icons are already on individual records ✓

### 7. Rename "Reporting To Email" label
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- **View mode** (line ~1028): Change `"Reporting To Email (Optional)"` to `"Line Manager Email Address (Optional)"`
- **Edit mode** (line ~1529): Change label to `"Line Manager Email Address (Optional)"` and update placeholder/helper text

### 8. Move My Round Table to last in tab sequence
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- **Mobile tabs** (lines 826-839): Move the `roundtable` TabsTrigger to after `nok-iced` (which is being removed, so it goes last after `documents`)
- **Desktop tabs** (lines 844-896): Move the `roundtable` TabsTrigger to after the My Admin group button
- **SECTION_TABS**: Reorder `care` to `["doctors", "sessions"]` and add `roundtable` at end: `care: ["doctors", "sessions", "roundtable"]` — already last in care, but on desktop it should appear after My Admin. Move it out of the main tabs row to appear after My Admin button.

Updated mobile order: Dashboard, Personal, Medical, H/Care Providers, Sessions, Calendar, Tasks, Documents, Round Table

Updated desktop order: Dashboard, My Profile (sub-tabs), H/Care Providers, Sessions, My Admin (sub-tabs), Round Table

### 9. Remove duplicate headers within tab content
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- The tab already has a trigger label (e.g., "My Documents"), then inside `TabsContent` there's a repeated `<h2>` and `<p>` description. Remove these redundant header blocks from:
  - Personal tab view (lines 915-918) and edit (lines 1368-1371)
  - Medical tab view (lines 1043-1046) and edit (lines 1544-1547)
  - Tasks tab (lines 1274-1276)
  - Sessions tab (lines 1286-1288)
  - Doctors tab (lines 1313-1316)
  - Round Table tab (lines 1325-1328)
  - NOK & ICE tab (lines 1337-1340) — being removed anyway

**File:** `src/pages/patient/PatientDocuments.tsx`
- When rendered inside the tab (via `hideHeader={false}` at line 1306), the Documents component shows its own "My Documents" header. Change the call to `<PatientDocuments hideHeader />` (pass `hideHeader={true}`) so the embedded header is suppressed.

**File:** `src/pages/patient/PatientCalendar.tsx`
- Add a `hideHeader` prop. When true, hide the "My Calendar" heading and description (lines 351-354). Update the call in PatientDetailsEditor to pass `hideHeader`.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/patients/PatientDetailsEditor.tsx` | Remove ICE sections, delete NOK & ICE tab, move NOK to Medical tab, rename email label, reorder Round Table last, remove duplicate tab headers |
| `src/pages/patient/PatientCalendar.tsx` | Move upcoming appointments to top, add hideHeader prop |
| `src/pages/patient/PatientDocuments.tsx` | Pass hideHeader when embedded |
| `src/components/patients/NokIcedTab.tsx` | Can be deleted (no longer referenced) |
| DB Migration | Drop `ice_contacts` column from `patients` table |

