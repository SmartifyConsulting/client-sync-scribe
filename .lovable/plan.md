## Goal

Make the Admin → Users screen actually editable, and re-frame each user as one of three categories:

1. **Patient**
2. **Healthcare Provider** (doctor)
3. **Emergency Service** (hospital_staff / ambulance_staff / blood_bank) — with the linked **company name** shown.

## Why the current screen feels "uneditable"

- The role `<Select>` only lists `doctor`, `patient`, `admin`, `none`. Users that already hold an emergency role (`hospital_staff`, `ambulance_staff`, `blood_bank`) render with an empty select value, so the row visually looks read-only / saving silently no-ops.
- There is no surfaced error when the role enum value isn't one of the four hard-coded options, so admins perceive "edit doesn't work".
- Emergency providers also have a company name (`holarchelp_hospitals.name`, `holarchelp_ambulance_providers.company_name`, `blood_bank_providers.name`) that is never shown, so admins can't tell who they're editing.

## Changes (frontend only — no schema changes needed)

### 1. New "Category" column replacing the raw role badge
Map roles → categories:
- `patient` → **Patient** (teal badge)
- `doctor` → **Healthcare Provider** (blue badge)
- `hospital_staff` | `ambulance_staff` | `blood_bank` → **Emergency Service** (red badge) + sub-label of provider type (Hospital / Ambulance / Blood Bank)
- `admin` → **Admin** (existing red)
- `none` → **None**

### 2. New "Company / Practice" column
- For doctors: pull `profiles.practice_name` (or fall back to "—").
- For emergency staff: look up the owned/member row in `holarchelp_hospitals`, `holarchelp_ambulance_providers`, or `blood_bank_providers` and display the company name.
- Fetched in a single batched query on load and joined client-side by `user_id`.

### 3. Editable role select — full enum
Replace the role dropdown with a two-step picker:
- **Category** select: Patient / Healthcare Provider / Emergency Service / Admin / None
- If "Emergency Service" → show a **second select** for sub-type: Hospital Staff / Ambulance Staff / Blood Bank
- On save, write the resolved enum value into `user_roles` (delete-then-insert as today, but now supports the emergency enums).

### 4. Make save errors visible
- Surface any RLS / enum errors via the existing toast (already wired) and disable the save button only while `saving` is true. Add a console.error so admins reporting "nothing happens" can be diagnosed.

### 5. Compact layout for new columns
- Add Category and Company columns; keep the table within `max-w-6xl` and allow horizontal scroll on mobile.

## Files to edit
- `src/features/admin/pages/UserManagement.tsx` — add Category + Company columns, expand role editor with emergency sub-types, batched fetch of practice/company names from `profiles`, `holarchelp_hospitals`, `holarchelp_ambulance_providers`, `blood_bank_providers`.

## Out of scope
- No DB migration. The `user_role` enum already contains all needed values.
- No changes to signup or routing — purely the Admin Users screen.
