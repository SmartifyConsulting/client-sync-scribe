

# Darken Inactive Items, Accordion Sections, Smaller Document Rows

## Summary
Three changes: make deactivated/inactive medications and symptoms more visible with darker styling, wrap Conditions/Diagnoses, Medications, Symptoms, and Allergies in collapsible accordions in the Overview tab, and reduce document row font size by 35% across all views.

## Changes

### 1. Darken deactivated Medications and Symptoms in Overview
**File:** `src/components/patients/PatientOverview.tsx`
- Currently inactive items use `text-muted-foreground/50` (50% opacity) which is too faint
- Change to `text-muted-foreground` (no opacity reduction) for the text, and use `line-through` decoration to visually distinguish inactive from active
- Apply to: Medications (lines 707-708), Symptoms (lines 744-745), and Conditions (lines 667-668)
- Also darken the inactive dot indicators from `bg-muted-foreground/40` to `bg-muted-foreground/60`

### 2. Make Conditions/Diagnoses, Medications, Symptoms, and Allergies collapsible
**File:** `src/components/patients/PatientOverview.tsx`
- Wrap each of the four sections (Allergies, Conditions/Diagnoses, Medications, Symptoms) in a `Collapsible` component with `defaultOpen={true}`
- Convert each section header into a `CollapsibleTrigger` with a chevron icon
- Wrap the list content in `CollapsibleContent`
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`

### 3. Reduce Document row font size by 35%
**File:** `src/pages/PatientProfile.tsx`
- Document name (`font-semibold`): change from default to `text-[10px]`
- Document date (`text-sm`): change to `text-[9px]`
- Template badge (`text-xs`): change to `text-[8px]`
- DRAFT badge: already `text-[10px]`, change to `text-[7px]`
- Reduce icon container and icon sizes proportionally (h-12/w-12 → h-8/w-8, h-6/w-6 → h-4/w-4)
- Reduce row padding from `p-5` to `p-3`

## Files Modified

| File | Changes |
|------|---------|
| `src/components/patients/PatientOverview.tsx` | Darken inactive item styling, wrap 4 sections in collapsibles |
| `src/pages/PatientProfile.tsx` | Reduce document row font/icon/padding sizes by ~35% |

