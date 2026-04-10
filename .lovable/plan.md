

# Collapsible Accordion Sections in Medical Information Tab

## Summary
Reorganize the Medical Information tab content into four collapsible accordion groups. Rename the vitals section to "General Information". Apply to both view and edit modes, across all screen sizes (mobile, tablet, desktop).

## Accordion Groups

```text
1. General Information (expanded by default)
   → Height, Weight, BMI, Blood Type

2. Allergies, Medication & Conditions
   → Allergies, Medication list, Conditions & Diagnoses

3. Surgeries & Dates
   → Surgical history entries

4. Family History
   → Family history entries
```

## Changes

### `src/components/patients/PatientDetailsEditor.tsx`

**Import**: Add `Collapsible, CollapsibleTrigger, CollapsibleContent` from `@/components/ui/collapsible` and `ChevronDown` from lucide-react (if not already imported).

**View mode** (lines ~948-1071):
- Remove the outer `sectionFrame` wrapper that currently groups everything
- Rename the "Medical Information" h3 heading to "General Information"
- Wrap the Height/Weight/BMI/Blood Type grid in a `Collapsible` defaultOpen, with a clickable trigger header showing "General Information" + chevron icon
- Wrap Allergies + Medication + Conditions & Diagnoses into a second `Collapsible` defaultOpen, with trigger "Allergies, Medication & Conditions"
- Wrap Surgeries into a third `Collapsible` with trigger "Surgeries & Dates"
- Wrap Family History into a fourth `Collapsible` with trigger "Family History"
- Each trigger will have a rotating chevron indicator
- Organ Donor remains outside accordions (at the bottom)

**Edit mode** (lines ~1394-1650):
- Same restructure: rename heading, wrap the same groups in `Collapsible` components
- All collapsibles defaultOpen in edit mode so users can immediately interact
- Each group has the same chevron toggle behavior

**Styling**:
- Each collapsible trigger: styled as a compact header bar with icon, uppercase label, and chevron
- Reuse existing `rounded-xl border border-primary/30 bg-card p-3` styling for each group
- Chevron rotates 180deg when open using `data-[state=open]:rotate-180` transition

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Wrap medical sections in Collapsible groups (both view and edit modes); rename "Medical Information" vitals heading to "General Information" |

No new components or dependencies needed — `Collapsible` UI component already exists in the project.

