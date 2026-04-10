

# Multi-Fix Plan: ICE Removal, Edit UX, Rewards Fixes, Heading Consistency, Top Bar Cleanup

## Summary
Remove all remaining ICE contact references, fix the edit button UX, rename Milestones to Wins, fix rewards tab visibility on web/tablet, standardize heading sizes, move mic/calendar from top bar to dashboard, and move Partner Apps to top of Vulas tab.

## Changes

### 1. Remove all ICE contacts from code and DB
**Files:** `src/components/patients/PatientDetailsEditor.tsx`, `src/hooks/usePatients.ts`
- Remove `ICEContact` interface import and usage
- Remove state variables: `iceContacts`, `showAddICE`, `newICE`, `editingICEId`
- Remove handlers: `handleAddICE`, `handleEditICE`, `handleShareICE`, `handleICEAsNOK`
- Remove `handleShareRecord` "ice" case and `setIceContacts` references
- Remove ICE collapsible sections in both view mode (~lines 1468-1537) and edit mode (~lines 2284-2420)
- Remove `nok-iced` from `SECTION_TABS.health` → `["personal", "medical"]`
- Remove `nok-iced` from `PROFILE_TABS` → `["personal", "medical"]`
- Remove NOK & ICE tab triggers from both mobile and desktop tab lists
- Remove `ice_contacts` from `handleCancel` reset, `saveChanges`, initial state load
- In `usePatients.ts`: Remove `ICEContact` interface, `parseICEContacts`, `ice_contacts` from Patient type and `toDbPatient`

### 2. Remove Edit button, keep per-section pencil approach
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Remove the global Edit button block (view mode ~line 1366-1370)
- Remove the global Done button block (edit mode ~line 1950-1967)
- Remove the global `isEditing` state toggle — instead, always render edit-capable sections
- Each `SectionHeader` should show a pencil icon when expanded; clicking toggles that section to edit mode
- Enhanced `SectionHeader` already has `isEditing`, `onEdit`, `onSave`, `onCancel` props (from previous changes). Ensure all sections use them consistently
- The approach: remove the bifurcated "VIEW MODE" / "EDIT MODE" rendering. Instead, render a single set of tab contents where each collapsible section independently manages view vs edit via `editingSections` state map

### 3. Remove Edit button from Dashboard tab
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- The dashboard tab content doesn't have form fields, so no edit button should appear when dashboard tab is active. With removal of the global edit button (step 2), this is automatically resolved.

### 4. Rename "Milestones" to "Wins" in Rewards
**File:** `src/pages/patient/MyRewards.tsx`
- Change TabsTrigger label from "Milestones" to "Wins" (line 389-391)
- Change CardTitle from "Milestone Achievements" to "Wins" (line 523)
- Keep the `MILESTONES` constant name as-is internally

### 5. Move Approved Vula Partner Apps to top of Vulas tab
**File:** `src/pages/patient/MyRewards.tsx`
- In `TabsContent value="transfers"` (line 644-734), move the "Approved Vula Partner Apps" card (lines 697-733) to before the "Transfer History" card (lines 645-695)
- Add a "Transfer" button to each partner app card (already present at line 725)

### 6. Fix "My Rewards" tab missing on web/tablet
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In the desktop/tablet `renderTabsList()`, add a "My Rewards" tab trigger that navigates to `/patient/rewards` (similar to "My Practice" pattern at lines 1309-1320)
- Place it after the "My Admin" group button

### 7. Standardize main heading sizes across app
**File:** `src/pages/patient/MyRewards.tsx`
- Change `text-3xl` on h1 (line 255) to `text-2xl` to match "My Holarchive" heading size consistently

### 8. Remove Mic and Calendar from patient top bar, move to dashboard
**File:** `src/components/layout/PatientAppLayout.tsx`
- Remove the Mic button (lines 184-197)
- Remove the mobile Calendar indicator (lines 162-182)
- Keep Bell and Avatar only in top bar

**File:** `src/pages/patient/PatientDashboard.tsx`
- Add a "Record a Task" (Mic) quick action button to the dashboard
- Add a "Calendar" quick action button to the dashboard (if not already present — it likely already has calendar links)

## Files Modified

| File | Changes |
|------|---------|
| `src/components/patients/PatientDetailsEditor.tsx` | Remove all ICE code, remove nok-iced tab, remove global Edit/Done buttons, add Rewards tab on desktop |
| `src/hooks/usePatients.ts` | Remove ICEContact interface and ice_contacts handling |
| `src/pages/patient/MyRewards.tsx` | Rename Milestones→Wins, move Partner Apps to top, fix heading size |
| `src/components/layout/PatientAppLayout.tsx` | Remove Mic and Calendar from top bar |
| `src/pages/patient/PatientDashboard.tsx` | Add Mic quick action |

