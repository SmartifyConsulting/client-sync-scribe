

# Organ Donor Styling, Rewards Updates, Edit UX Overhaul

## Summary
Fix Organ Donor section header to match grey style, add partner apps and transfer to Vulas tab, merge Assigned Tasks into Overview, shrink reward cards on mobile, and move Edit functionality into each collapsible section header with autosave + save/cancel icons.

## Changes

### 1. Organ Donor — grey section header
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Lines ~1097-1113 (view mode) and the matching edit mode block: Replace the custom `bg-primary` + `text-white` `CollapsibleTrigger` with `bg-[#F5F4F1]` + `text-foreground` to match the `SectionHeader` component style. Keep the inline Yes/No badge and chevron but change chevron from `text-white` to `text-foreground`.
- Refactor to reuse `SectionHeader` with an `extra` prop for the Yes/No badge.

### 2. Show Approved Vula Partner Apps under Vulas tab with transfer
**File:** `src/pages/patient/MyRewards.tsx`
- In `TabsContent value="transfers"` (the Vulas tab), append the partner apps grid (currently in `vula-apps` tab) below the transfer history
- Add a "Transfer Vulas" button inline with each partner app card (select app + enter amount + submit)
- Remove the separate `vula-apps` tab trigger and content since it's now merged into the Vulas/transfers tab
- Keep the existing transfer dialog and mutation logic

### 3. Combine Assigned Tasks into Overview tab
**File:** `src/pages/patient/MyRewards.tsx`
- Move the Assigned Tasks card (lines ~480-548) into the Overview `TabsContent` (after Recent Rewards)
- Remove the separate `tasks` TabsTrigger and `TabsContent`
- Keep the `ActivityProofCapture` component and all task rendering logic

### 4. Reduce reward card size on mobile — single row
**File:** `src/pages/patient/MyRewards.tsx`
- Hero stats grid (lines ~319-376): Change from `grid gap-4 md:grid-cols-4` to `grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4`
- Inside each card's `CardContent`: reduce padding and font sizes on mobile (`text-2xl md:text-4xl` for numbers, `h-10 w-10 md:h-14 md:w-14` for icons)
- Make cards more compact on small screens

### 5. Move Edit button into section headers — autosave with save/cancel icons
**File:** `src/components/patients/PatientDetailsEditor.tsx`

This is the most significant change. The approach:

- **Remove the top-level Edit/Done button** (lines ~905-909 in view mode, ~1285-1289 in edit mode)
- **Eliminate the global view/edit mode toggle** — instead, each collapsible section manages its own editing state independently
- **Update `SectionHeader`** to accept optional `onEdit`, `onSave`, `onCancel`, `isEditing`, `isSaving`, and `hasChanges` props
- When a section is expanded in view mode, show a small `Pencil` icon in the header area
- When clicked, that section switches to edit mode (inline)
- When edits are detected (`hasChanges`), show `Check` (save) and `X` (cancel) icons in the header
- **Autosave**: Use a debounced save (e.g., 2-second debounce after last change) calling `onSave` with the section's changed fields
- The save/cancel icons provide immediate manual save and revert options

Implementation approach:
- Create a new `EditableSectionHeader` component that wraps `CollapsibleTrigger` and includes edit/save/cancel icon buttons
- Each section (Personal Details, Addresses, Employer, etc.) uses local state to track if that specific section is being edited
- A `useSectionEdit` hook or inline state per section manages `isEditing`, `hasChanges`, debounced autosave
- The global `isEditing` state is removed; the `formData` and `updateFormData` remain shared
- When any section enters edit mode, its content renders form fields; when in view mode, renders `ViewField`s
- This applies to Personal, Medical, and all expandable sections across all tabs

Given the complexity, a pragmatic first pass:
- Keep global `formData` state but remove the top-level Edit button
- Each `SectionHeader` gets an edit pencil icon that sets a per-section editing flag
- When editing, show save (Check) and cancel (X) icons in the header
- Autosave via `useEffect` with debounce on `formData` changes
- Apply to all collapsible sections in Personal and Medical tabs

### 6. Apply section-level edit to all layouts
The `SectionHeader` component is already used across all layouts (mobile, tablet, desktop), so updating it once applies everywhere.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/patients/PatientDetailsEditor.tsx` | Grey Organ Donor header; remove top-level Edit button; add edit/save/cancel icons to each SectionHeader; autosave with debounce |
| `src/pages/patient/MyRewards.tsx` | Merge tasks into overview; merge partner apps into Vulas tab; compact mobile reward cards; remove separate tabs |

