## 1. Rename "Vula Vouchers" → "Vulas"

User-facing text only. Keep DB column names, hooks, and internal identifiers untouched.

- `src/i18n/locales/*.json` (all 25 files): replace strings `"Vula Vouchers"`, `"Vula voucher"`, `"Vula voucher(s)"` with `"Vulas"` (and localized equivalents kept in English for now — same string).
- `src/pages/patient/MyRewards.tsx`: card title `Vula Vouchers` → `Vulas`; `alt="Vula Vouchers"` → `alt="Vulas"`; "Use your Vula Vouchers at these merchants" → "Use your Vulas at these merchants".
- `src/pages/patient/MyDetails.tsx`: subtitle "Track your Vula vouchers…" → "Track your Vulas…".
- `src/pages/doctor/DoctorRewards.tsx`: all `alt="Vula Vouchers"` → `alt="Vulas"`.
- `src/features/patients/components/PatientDetailsEditor.tsx`: 3 alt strings + 2 comments.
- `src/features/rewards/components/VulaExplainerDialog.tsx`: alt.
- `src/pages/Dashboard.tsx`: title key `doctorDashboard.vulaVouchers` value updated in locale JSON only.
- `src/components/gamification/LollipopReport.tsx`: label "Vula Vouchers" → "Vulas".

## 2. Update the Vula logo

Replace image files in place — no import changes needed:

- `src/assets/vula-vouchers-logo.png`
- `src/assets/vula-vouchers-logo-v2.png`
- `src/assets/vula-vouchers-logo-v3.png`
- `src/assets/vula-symbol.png`

Copy `user-uploads://VulasLogoV2.png` to each path (transparent white background; existing components already control sizing via Tailwind).

## 3. To-Do row: action label inside patient group

Add an optional `insideGroup?: boolean` prop to `src/components/todos/TodoRow.tsx`.

When `insideGroup` is true:
- Do NOT render the patient name. Instead render a kind-based action label:
  - `invoice` → "Review Invoice"
  - `medical_certificate` → "Review Medical Certificate"
  - `prescription` → "Review Prescription"
  - `referral` → "Review Referral"
  - `laboratory` → "Review Lab Request"
  - `recommendation` → "Review Letter"
  - `appointment` → the appointment title (date + time shown separately)
  - other kinds fall back to `display.shortLabel`.

Pass `insideGroup` from both `src/pages/TodoList.tsx` and `src/components/dashboard/CompactTodoList.tsx` when rendering rows inside a patient `Collapsible`.

## 4. Appointment row layout & actions

In `TodoRow` when `display.kind === "appointment"`:

- Hide the standalone "Preview" and "Edit / Accept" buttons currently rendered before the ellipsis. Move both into the `DropdownMenu` (ellipsis) as menu items:
  - `Preview Calendar` (calls `onPreviewCalendar`)
  - `Edit / Accept` (calls `onEditAppointment`)
- Remove the "Mark complete / Reopen" menu item for appointments (cannot mark complete).
- Hide the round `Checkbox` for appointments (replace with an equivalent-width spacer so the row still aligns).
- Use the freed space to render **date and time together** (not just time). Show `display.date · display.time` (e.g. `24 Jul · 09:30`) as a single meta chunk, visible on all breakpoints (not `hidden sm:inline-flex`).

## 5. Indent the "Mark done" checkboxes

Add left padding to the row container in `TodoRow` (e.g. change `px-2` → `pl-6 pr-2`) so the round completion circles sit inset from the frame edge, reducing visual density inside the patient group. Applies uniformly to compact and full rows.

## Notes / non-goals

- No schema changes, no rename of the `vula_*` tables, columns, functions, or edge functions.
- No changes to the Vula Vault (partner) branding — only "Vula Vouchers" wording is renamed.
- Icon legend stays removed (per prior turn).
