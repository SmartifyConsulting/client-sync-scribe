

# Multi-Feature Update Plan (Revised)

## Changes

### 1. Signature Font Dropdown — Show Font Name in Its Font
**File:** `src/pages/MyPractice.tsx`
Revert dropdown items to show the **font name** rendered in its own typeface. Show doctor's name in smaller text below. Trigger also shows font name in its typeface.

### 2. Remove Language from Settings Preferences
**File:** `src/pages/Settings.tsx`
Remove the Language sub-frame (Country selector and Narration Voice) from Preferences tab.

### 3. Medical Information — Flatten Field Labels
**File:** `src/components/patients/PatientDetailsEditor.tsx`
Convert `<h4>` sub-headings (Physical Measurements, Blood Type, Allergies, Chronic Medication) into regular `<Label>` elements within the single Medical Information frame.

### 4. Persist Calendar View Mode
**File:** `src/pages/CalendarView.tsx`
Initialize `calendarView` from `localStorage` and save on each change.

### 5. My Documents — Icons Inline with Heading
**Files:** `src/pages/patient/PatientDocuments.tsx`, `src/components/patients/PatientDetailsEditor.tsx`
Move record audio/video/upload icons to the same row as the "My Documents" heading.

### 6. Narrow Mobile Area Code Width
**Files:** `src/pages/MyPractice.tsx`, `src/pages/Auth.tsx`
Reduce country code selector from `w-[130px]` to `w-[80px]`.

### 7. Increase Global Font Sizes by 1 Unit
**Files:** `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`
Bump each `text-[Npx]` class up by 1px.

### 8. Update Moola Icon
**File:** `src/assets/moola-symbol.png`
Replace with the uploaded enlarged M icon.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Font dropdown labels, narrow area code |
| `src/components/patients/PatientDetailsEditor.tsx` | Medical field labels, documents header |
| `src/pages/Settings.tsx` | Remove Language sub-frame |
| `src/pages/CalendarView.tsx` | Persist view mode in localStorage |
| `src/pages/patient/PatientDocuments.tsx` | Compact header with icons inline |
| `src/components/ui/button.tsx` | +1px font size |
| `src/components/ui/input.tsx` | +1px font size |
| `src/components/ui/label.tsx` | +1px font size |
| `src/assets/moola-symbol.png` | Replace with uploaded icon |
| `src/pages/Auth.tsx` | Narrow area code width |

