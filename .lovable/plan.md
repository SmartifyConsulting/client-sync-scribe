

# Appointment Color Coding, Profile Patients Tab & UI Refinements

## 1. Doctor Appointment Type Color Coding

**Database**: Create `appointment_type_colors` table to let doctors define custom colors per appointment type.

```sql
CREATE TABLE appointment_type_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type_name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, type_name)
);
ALTER TABLE appointment_type_colors ENABLE ROW LEVEL SECURITY;
-- RLS: users manage their own
```

**File: `src/pages/CalendarView.tsx`**
- Fetch `appointment_type_colors` for the current doctor
- Replace hardcoded `getEventTypeColor` with lookup against the doctor's color map
- Change the initials badge `bg-terracotta` to use the appointment type's color dynamically via inline `style={{ backgroundColor: color }}`
- Add a small "Manage Colors" dialog accessible from the calendar header where doctors can add/edit type→color mappings (color picker + type name input)

**File: `src/pages/patient/PatientCalendar.tsx`**
- Similarly apply appointment type colors to patient-facing calendar badges

## 2. New "Patients" Tab in Doctor Profile (after Partners)

**File: `src/pages/Profile.tsx`**
- Change `grid-cols-5` to `grid-cols-6` on TabsList (line 495)
- Add a new `TabsTrigger value="patients"` after Partners and before Pricing
- Add `TabsContent value="patients"` containing the existing `PatientImport` component (already imported at line 4)
- Remove the drag-and-drop import UI from wherever else it currently appears (if duplicated)
- Ensure drag-and-drop only renders inside this Patients tab

## 3. ME Record Badge Color Change (Terracotta → Plum/Lilac)

**File: `src/pages/Patients.tsx`**
- Change the ME badge from `bg-terracotta text-terracotta-foreground` to a plum/lilac color: `bg-purple-200 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300`
- Change the ME row header from `bg-terracotta/20` to `bg-purple-100/60 dark:bg-purple-950/30`
- Change border accent from `border-terracotta` to `border-purple-400`
- Update the inline "ME" pill badge similarly

## 4. Patient Table Compactness & Status Dots

**File: `src/pages/Patients.tsx`**
- Reduce font size across all table cells: change `text-sm` to `text-xs` for contact, dates, status
- Reduce padding from `px-6 py-4` to `px-4 py-2.5` on all `td` and `th` elements
- Ensure patient names render on one line with `whitespace-nowrap truncate`
- Replace the Status text badges ("Active"/"Inactive") with a colored dot: green `bg-emerald-500` for active, red `bg-red-400` for inactive — just a `h-2.5 w-2.5 rounded-full` element with a tooltip
- Move the Status column closer to Actions by removing extra padding

## 5. Connections Page Tab Styling — Teal

**File: `src/pages/Connections.tsx`** (lines 354-375)
- Apply the standardized teal tab styling to the TabsList: add `bg-primary` class
- Update TabsTrigger classes to match doctor profile tabs: `data-[state=active]:bg-white data-[state=active]:text-black text-white`

## Files Modified

| File | Change |
|------|--------|
| `src/pages/CalendarView.tsx` | Dynamic appointment type colors on initials badges; color management dialog |
| `src/pages/patient/PatientCalendar.tsx` | Apply appointment type colors |
| `src/pages/Profile.tsx` | Add "Patients" tab (6th) after Partners with PatientImport |
| `src/pages/Patients.tsx` | ME badge → plum; compact table (smaller font, tighter padding, dot status) |
| `src/pages/Connections.tsx` | Teal tab styling on Connected/Pending tabs |
| Database migration | Create `appointment_type_colors` table with RLS |

