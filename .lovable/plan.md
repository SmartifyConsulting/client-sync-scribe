

# Plan: Navigation Restructure + My Round Table in Holarchive

## Changes

### 1. Sidebar — Remove username link (`Sidebar.tsx`)
Replace the `<NavLink>` wrapping the user's full name in the bottom section (line 152-158) with a plain `<div>`. Remove the link behavior and hover:underline styling. The name stays visible but is no longer clickable.

### 2. Sidebar — Remove "My Round Table" from patient nav (`Sidebar.tsx`)
Remove `{ icon: MessageSquare, label: "My Round Table", to: "/patient/round-table" }` from `patientNavItems` array (line 55).

### 3. Add "My Round Table" tab to PatientDetailsEditor (`PatientDetailsEditor.tsx`)
- Lazy-import `PatientRoundTable` component
- Add a new `TabsTrigger value="roundtable"` labeled "My Round Table" next to "My Doctors" (only when `isSelfService` is true)
- Add corresponding `TabsContent` rendering the `PatientRoundTable` component
- Apply in both the mobile and desktop tab layouts (lines ~340-346 and ~554-560)

### 4. Auto-create patient record on signup (`Auth.tsx`)
After a patient signs up without an invitation, auto-insert a blank `patients` record with `patient_user_id = user.id`.

### 5. Profile.tsx — Patient view: remove tabs, show Holarchive directly
Remove the 3-tab layout for patients. Render `PatientDetailsEditor` directly with auto-create fallback if no record exists.

### 6. Settings.tsx — Convert to tabbed layout
Replace flat sections with tabs: **Personal** | **Preferences** | **Calendar Integration** | **Notifications** | **Security** | **Billing** | **Data Management**. Move Personal and Preferences content from Profile.tsx patient section here. Payment History becomes a sub-tab under Billing.

### 7. Database migration — RLS policy for patient self-insert
```sql
CREATE POLICY "Patients can create their own patient record"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (patient_user_id = auth.uid());
```

## Files Modified
| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Remove username link; remove My Round Table from patient nav |
| `src/components/patients/PatientDetailsEditor.tsx` | Add "My Round Table" tab (isSelfService only) |
| `src/pages/Auth.tsx` | Auto-create patient record on signup |
| `src/pages/Profile.tsx` | Patient view: direct Holarchive rendering with auto-create |
| `src/pages/Settings.tsx` | Tabbed layout with Personal, Preferences, Billing (with Payment History sub-tab), etc. |
| DB migration | RLS policy for patient self-insert |

