# Sidebar nav restructure (desktop + tablet only)

Mobile `BottomNav` is left untouched. All changes are in `src/components/layout/Sidebar.tsx` plus a new doctor Documents page.

## 1. Patient sidebar (`patientNavItems`)

Remove `My Desk`. Replace with three entries inserted in the same position, before `My Rewards`:

```text
My Profile
My Holarchy
My Calendar     -> /patient/calendar       (icon: Calendar)
My Tasks        -> /patient/tasks          (icon: ListChecks)
My Documents    -> /patient/documents      (icon: FolderOpen)
My Rewards
SOS
```

All three target routes already exist in `App.tsx` (`PatientCalendar`, `PatientTasks`, `PatientDocuments`).

## 2. Doctor sidebar (`doctorNavItems`)

Remove `My Admin`. Unpack into three top-level entries, and add `My Round Tables` directly under Documents:

```text
Home
My Patients
My Practice
My Calendar         -> /calendar              (icon: Calendar)
My Tasks            -> /todos                 (icon: ListChecks)
My Documents        -> /documents             (icon: FolderOpen)
My Round Tables  -> /doctor/round-tables   (icon: Users2)
My Rewards
SOS
```

## 3. Doctor `/documents` page — house Documents + Templates

The current `/documents` route renders `src/pages/Documents.tsx`, which is actually a Templates manager. To honour "Documents will house Documents and Templates", convert that page to a tabbed wrapper:

- New tabs (teal `bg-primary` TabsList per project standard): `Documents` (default) and `Templates`.
- `Templates` tab renders the existing Templates body extracted from current `Documents.tsx` into `DocumentsTemplatesTab`.
- `Documents` tab renders a new `DoctorDocumentsTab` that lists clinical documents the doctor has access to, reusing the existing document query/components already used inside patient profiles (read-only list with filters, no per-patient scoping). No schema or edge-function changes.

The `/admin` page's `Templates` tab keeps working because it still imports `Documents` (now the tabbed wrapper) with `hideHeader`; we keep an optional `defaultTab` prop so Admin can continue defaulting to Templates if desired. Out of scope: removing the Admin page itself (route remains for admins via the conditional admin entry).

## 4. New doctor route

Add `/doctor/round-tables` in `App.tsx` rendering a new `DoctorRoundTablesPage` that wraps the existing `DoctorRoundTables` component (already used in dashboards). No new data layer.

## Files

- `src/components/layout/Sidebar.tsx` — update `patientNavItems` and `doctorNavItems`, add `ListChecks`/`Users2` icon imports, drop `UserCog` if unused.
- `src/pages/Documents.tsx` — convert to tabbed wrapper (Documents | Templates) with optional `defaultTab` prop.
- `src/pages/doctor/DoctorDocumentsTab.tsx` (new) — clinical documents list for the doctor.
- `src/pages/doctor/DoctorRoundTablesPage.tsx` (new) — wraps `DoctorRoundTables`.
- `src/App.tsx` — add `/doctor/round-tables` route.

## Out of scope

- Mobile `BottomNav`.
- Admin page restructure (remains reachable for admins).
- Backend, schema, edge functions, RLS.
- Visual redesign beyond adding the new tabs in standardized teal styling.