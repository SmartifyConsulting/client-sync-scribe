## 1. Preferred Hospitals tab (My Holarchy)

- Add a **Hospitals** tab alongside My Holarc Team / Insurance / Pharmacies in the patient profile, with the frame heading **Preferred Hospitals**.
- Patients add hospitals by searching the registered hospital directory — no free-text entries. Each row shows name, city/address, phone, and a remove action.
- Storage: new `preferred_hospitals` JSONB column on `patients` (hospital id + cached name/address).

## 2. Phone number fields

- Drop the country-code dropdown: the field shows only the local number and uses the full available width.
- The dial code already stored on the record is preserved silently on save.

## 3. Accordions collapsed by default

- Personal Information, Medical Information and My Practice sections all start collapsed.

## 4. Search filters cleanup

- Remove the left-hand "Filters" side panel from Referrals, My Holarc Team, and Preferred Hospitals; keep a single inline search box above each list.
- Each search queries only its own entity: doctor searches return doctors, hospital searches return hospitals, team search returns connected providers.

## 5. Renaming

| Old | New |
| --- | --- |
| My History (profile tab) | Sessions |
| My Sessions (nav) | Sessions |
| My Tasks (nav) | Tasks |
| All Documents (nav) | Documents |
| My Round Tables (nav) | Round Tables |

## 6. New Admissions nav item

- New sidebar entry **Admissions** directly under My Patients, with its own route and page.
- Default view: admissions for roster patients where the signed-in doctor is the attending/admitting practitioner.
- A toggle switches to admissions of those patients where another doctor is attending/admitting.
- Rows show patient, hospital, ward/bed, admit date, status, attending doctor; clicking opens the existing admission detail view.

## 7. "Mine only" filters

- Sessions, Tasks, Documents and Round Tables each get a Mine / All filter control.

## 8. Accordion polish

- Add vertical padding/spacing between accordion group names and their child rows.
- Remove divider lines between accordion records; rely on spacing.
- Fix count pills that render blank — always show the real count, and hide the pill entirely when the group is empty.

## 9. Documents tabs and button standardisation

- Fix the broken Documents tab strip (pill overlapping the label, unreadable second tab).
- Standardise all buttons on the "Add Document" format (height, padding, radius, font size/weight, icon size) via shared button variants.
- Reduce home page button font size by one step.

## 10. Profile switcher

- Remove the lingering "Dean Allie (Patient)" entry from the avatar profile switcher, including from the impersonation seed list that re-adds it.

## 11. To-Do list: hide already-handled document tasks

- Document review tasks are suppressed from the To-Do list when the doctor already reviewed and sent that document during the session.
- On send, the linked review task is marked complete so it never appears as outstanding work; tasks for documents still in draft or unsent remain visible.

## Technical notes

- One migration: add `preferred_hospitals` JSONB (default `[]`) to `public.patients`; existing patient RLS covers it.
- Hospital search reads approved hospitals from the existing hospitals table.
- Nav/route changes in `Sidebar.tsx` and the router; new doctor Admissions page.
- Accordion spacing/pill fixes centralised in `section-accordion.tsx` and the group components.
- Button standardisation in the shared button variants rather than per-page overrides.
- To-Do suppression handled where session documents are sent, plus a filter in the To-Do query for tasks whose linked document is already sent.
