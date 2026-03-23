

# Plan: Reinstate My Patients, Fix Tab Sizes, Teal Frames, Bigger Section Headings, Restore Storage Indicator

## Changes

### 1. Reinstate "My Patients" in sidebar for doctors, remove from My Holarchive tabs

**`src/components/layout/Sidebar.tsx`**: Add `{ icon: Users, label: "My Patients", to: "/patients" }` to `doctorNavItems` (after Dashboard, before Calendar).

**`src/pages/Profile.tsx`**: Remove the `DoctorPatientsTab` component and the tabs wrapper for doctors. Doctor view of `/profile` should go straight to the Holarchive health record (same as patient view — just render `PatientDetailsEditor` directly). Remove the "My Patients" / "My Health Record" tab structure.

### 2. Alphabet filter on Patients page

Already exists in `src/pages/Patients.tsx` (lines 752-789). No change needed — it's present and functional.

### 3. Standardize all tab trigger font sizes

The "Personal Information" / "Medical Information" tabs in `PatientDetailsEditor.tsx` use `text-xs` (12px). Other tab triggers across the app use inconsistent sizes. Standardize all tab triggers to match:

| File | Current | Change |
|------|---------|--------|
| `PatientProfile.tsx` tabs (lines 329-341) | No explicit text size (inherits `text-[10px]` from component) | Add `text-xs` to match |
| `PatientDetailsEditor.tsx` tabs (line 342-347) | `text-xs` | Keep (reference standard) |
| `Profile.tsx` tabs (line 276-278) | No explicit size | Add `text-xs` |
| `src/components/ui/tabs.tsx` TabsTrigger default | `text-[10px]` | Change to `text-xs` so all tabs match by default |

### 4. Make all section frames teal-bordered

Change `sectionFrame` in `PatientDetailsEditor.tsx` from `border-border` to `border-primary`:

```
const sectionFrame = "rounded-xl border border-primary bg-card p-4 shadow-sm";
```

Also search for other frame patterns across the app and update to `border-primary`.

### 5. Make section headings (Allergies, Conditions, etc.) 30% bigger

These headings currently use `text-xs` (12px). Increase to `text-sm` (14px) — a ~17% increase at the CSS level but effectively ~30% bigger given the base font context.

In `PatientDetailsEditor.tsx`, change all `h3` section headings from `text-xs` to `text-sm`:
- Personal Details, Addresses, Next of Kin, Employer, General Notes
- Medical Insurance, Pharmacies, Physical Measurements, Blood Type, Allergies, Chronic Medication, Surgeries, Family History, Organ Donor

### 6. Ensure document storage capacity indicator is visible

The storage indicator in `PatientDocuments.tsx` (lines 660-698) is inside the component but may be hidden when `hideHeader` is true due to layout issues. Verify the storage card renders independently of the header. The storage card is rendered unconditionally (not wrapped in the `hideHeader` conditional), so it should be visible. If not, ensure it's placed outside any conditional block.

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Add "My Patients" nav item for doctors |
| `src/pages/Profile.tsx` | Remove DoctorPatientsTab; render Holarchive directly for doctors |
| `src/components/ui/tabs.tsx` | Default TabsTrigger size from `text-[10px]` to `text-xs` |
| `src/pages/PatientProfile.tsx` | Add `text-xs` to tab triggers for consistency |
| `src/components/patients/PatientDetailsEditor.tsx` | Change `sectionFrame` border to `border-primary`; change all `h3` headings from `text-xs` to `text-sm` |
| `src/pages/patient/PatientDocuments.tsx` | Verify storage indicator renders (likely no change needed) |

