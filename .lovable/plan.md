

# Collapsible Sections, Styling & Navigation Fixes

## Summary
Make every section/frame across all tabs collapsible (defaulting to collapsed). Style section headings with green background and white text. Fix Organ Donor layout, left-align headings on mobile, rename tab, and ensure bottom nav dynamically loads first tab content.

## Changes

### 1. `src/components/patients/PatientDetailsEditor.tsx`

**A. Wrap ALL section frames in Collapsible (both view and edit modes, all tabs)**

Every `<div className={sectionFrame}>` block across all tabs (Personal, Medical, etc.) will be converted to a `Collapsible` with a styled trigger header. This applies to:

- **Personal tab (view)**: Personal Details, Addresses, Next of Kin, ICE Contacts, Employer, General Notes (6 sections)
- **Personal tab (edit)**: Same 6 sections
- **Medical tab (view)**: Already done for 4 sections in column 1; add for Medical Insurance, General Practitioner, Pharmacies in column 2
- **Medical tab (edit)**: Same column 2 sections

**Default state**: All `Collapsible` components use `defaultOpen={false}` (collapsed by default).

**B. Section heading style — green background, white text**

Replace current heading style:
```
text-xs font-semibold text-foreground uppercase tracking-wide
```
With collapsible trigger header:
```
bg-primary text-white rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide
```
The `ChevronDown` icon also becomes white.

**C. Organ Donor — collapsible, inline Yes/No**

Convert `OrganDonorView` into a `Collapsible` section:
- Trigger shows "Organ Donor" label + "Yes"/"No" badge on the same line (inline, right-aligned before chevron)
- Content (organ list) is hidden inside `CollapsibleContent`, only relevant when "Yes"

**D. Left-align "Allergies, Medication & Conditions" heading**

The heading text within the `CollapsibleTrigger` already uses `flex items-center` — ensure no `text-center` is applied. Add `text-left` explicitly to the h3 for safety.

**E. Rename tab**

Change "My Healthcare Providers" to "My H/Care Providers" in both view and edit mode `TabsTrigger` labels (lines 829, 1235) and the `h2` heading inside the doctors tab content (line 1182).

**F. Bottom nav — dynamic first-tab loading**

Currently, when clicking a bottom nav icon, it navigates to `/patient/details?section=X`. The `Tabs` component uses `defaultValue` which only works on initial mount. When navigating between sections without unmounting, the tab doesn't switch.

Fix: Use controlled `Tabs` with a `value` state derived from `section` prop. When `section` changes, update the active tab to the first tab of that section. This ensures clicking a bottom nav icon immediately shows the correct content.

Add a `useEffect` or derive state from `section`:
```typescript
const [activeTab, setActiveTab] = useState(...)
useEffect(() => {
  if (isMobile && isSelfService && section && SECTION_TABS[section]) {
    setActiveTab(SECTION_TABS[section][0]);
  }
}, [section]);
```

Then use `<Tabs value={activeTab} onValueChange={setActiveTab}>` instead of `defaultValue`.

## Files Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | All changes above: collapsible sections (default collapsed), green+white heading style, organ donor inline + collapsible, left-align heading, rename tab, controlled tab switching |

