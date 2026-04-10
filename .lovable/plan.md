

# Dashboard Cleanup, Medical Tab Improvements, Edit Button Repositioning

## Changes

### 1. Patient Dashboard cleanup (`src/pages/patient/PatientDashboard.tsx`)

- **Remove "My Calendar" quick action** (lines 604-631): Delete the entire quick actions grid at the bottom that contains "My Calendar" and "Documentation"
- **Remove Medications, Healthcare Providers, Pharmacies row** (lines 385-476): Delete the entire 3-column grid (Row 2)
- **Remove Vula logo** from "My Vulas Balance" card (line 484): Remove the `<img>` tag showing vulaSymbol, keep only the text
- **Clean up Row 3**: Make it a proper 2-column grid with "My Vulas Balance" in col 1 and "Earn More Vulas" in col 2. Move "Recent Claims" into a new Row 4 as col 1, and "Documentation" as col 2 (link card to `/patient/documentation`)

### 2. Blood Type on same row as Height/Weight/BMI (`PatientDetailsEditor.tsx`)

**View mode** (lines 894-902): Move Blood Type into the `grid-cols-3` grid alongside Height, Weight, BMI — change to `grid-cols-4` and add Blood Type as the 4th field. Remove the standalone `<div><ViewField label="Blood Type" ...>` below.

**Edit mode**: Same change — add Blood Type select into the Height/Weight/BMI row.

### 3. Allergies in its own frame with icon (`PatientDetailsEditor.tsx`)

**View mode** (line 903): Replace the plain `<ViewField label="Allergies">` with a bordered frame matching the Medication/Surgeries pattern:
```
<div className="rounded-xl border border-primary/30 bg-card p-3 space-y-2">
  <h3 ...><AlertCircle icon /> Allergies</h3>
  <p>{allergies text}</p>
</div>
```

**Edit mode**: Wrap the allergies textarea in a similar frame with the AlertCircle icon heading.

### 4. Space after Organ Donor label (`PatientDetailsEditor.tsx`, line 682-697)

Add `className="mb-2"` to the `<Label>Organ Donor</Label>` or add a `mt-2` to the content below it, creating visual separation between the label and the Yes/No badge.

### 5. Remove "My Details" heading + move Edit button to tab bar (`PatientDetailsEditor.tsx`)

**View mode** (lines 760-767):
- Remove the `<h2>My Details</h2>` heading and its container div
- Move the Edit button into the `TabsList` — place it as the last element inside the tab bar, aligned to the right end using `ml-auto`
- The button sits visually in the green tab bar but is not a tab trigger

**Edit mode** (lines 1133-1140):
- Remove "Edit Patient Details" heading
- Move the "Done" button into the TabsList similarly

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/patient/PatientDashboard.tsx` | Remove My Calendar, Medications row, Providers row, Pharmacies row, Vula logo; clean up rows to: Row 1 (AI+Appointments), Row 2 (Vulas+Earn), Row 3 (Claims+Documentation) |
| `src/components/patients/PatientDetailsEditor.tsx` | Blood type in same row as height/weight/BMI; Allergies in bordered frame with icon; space after Organ Donor label; remove "My Details" heading; move Edit/Done button into tab bar |

