

# Plan: Fix Styling Inconsistencies + Remove Redundant Tab-Content Headings

## Part A: Fix Global UI Component Font Sizes (30% reduction)

Apply `text-sm` → `text-[10px]`, `text-base` → `text-[11px]`, `text-xs` → `text-[8px]`, `text-lg` → `text-[12px]`, `text-xl` → `text-sm` across all UI primitives:

| File | Change |
|------|--------|
| `button.tsx` | Scale all size variants down |
| `textarea.tsx` | `text-base` → `text-[11px]` |
| `badge.tsx` | `text-xs` → `text-[8px]` |
| `table.tsx` | `text-sm` → `text-[10px]` in Table and TableCaption |
| `tabs.tsx` | `text-sm` → `text-[10px]` in TabsTrigger |
| `dialog.tsx` | DialogTitle `text-lg` → `text-[12px]`; DialogDescription `text-sm` → `text-[10px]` |
| `alert-dialog.tsx` | Description `text-sm` → `text-[10px]` |
| `card.tsx` | CardTitle `text-xl` → `text-sm`; CardDescription `text-sm` → `text-[10px]` |
| `dropdown-menu.tsx` | All `text-sm` → `text-[10px]` |
| `select.tsx` | SelectItem/SelectLabel `text-sm` → `text-[10px]` |
| `calendar.tsx` | `text-sm` → `text-[10px]` |
| `form.tsx` | FormDescription/FormMessage `text-sm` → `text-[10px]` |
| `breadcrumb.tsx` | `text-sm` → `text-[10px]` |

## Part B: Remove Redundant Headings Inside Tab Content

When a component is rendered inside a tab whose trigger already names it, the heading inside the content is redundant. Found instances:

| Location | Tab Name | Redundant Heading Inside | Fix |
|----------|----------|--------------------------|-----|
| `PatientDetailsEditor.tsx` → "My Round Table" tab → renders `<PatientRoundTable />` | "My Round Table" | `<h1>Round Table</h1>` + description at line 54 of `PatientRoundTable.tsx` | Remove the `<h1>` and `<p>` heading block |
| `PatientDetailsEditor.tsx` → "My Documents" tab → renders `<PatientDocuments />` | "My Documents" | `<h1>My Documents</h1>` + description at line 535 of `PatientDocuments.tsx` | Remove the heading block |
| `PatientDetailsEditor.tsx` → "My Doctors" tab → renders `<MyDoctors />` | "My Doctors" | `<h1>My Doctors</h1>` + description at line 160 of `MyDoctors.tsx` | Remove the heading block |
| `PatientProfile.tsx` → "Round Table" tab → renders `<RoundTable />` | "Round Table" | `<h3>Round Table</h3>` + description at line 219 of `RoundTable.tsx` | Remove the heading block |

**Approach**: Since these components are also used standalone (e.g., from sidebar navigation), add an optional `hideHeader` prop (default `false`) to each. When rendered inside a tab, pass `hideHeader={true}` to suppress the redundant heading. This preserves headings when accessed directly.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/patient/PatientRoundTable.tsx` | Add `hideHeader` prop; conditionally hide h1+description |
| `src/pages/patient/PatientDocuments.tsx` | Add `hideHeader` prop; conditionally hide h1+description |
| `src/pages/patient/MyDoctors.tsx` | Add `hideHeader` prop; conditionally hide h1+description |
| `src/components/patients/RoundTable.tsx` | Add `hideHeader` prop; conditionally hide h3+description |
| `src/components/patients/PatientDetailsEditor.tsx` | Pass `hideHeader` to `PatientRoundTable`, `PatientDocuments`, `MyDoctors` inside tabs |
| `src/pages/PatientProfile.tsx` | Pass `hideHeader` to `RoundTable` inside tab |
| 13 UI component files (listed in Part A) | Font size scaling |

