# Hospital-side patient records: link admissions, keep users in the hospital profile

## What's happening now

- Georgia Adams' Maternity admission at Holarc General **is** linked to a patient record — but the patient name links to `/patients/<id>`, which is the doctor workspace route. Clicking it drops the hospital user out of the hospital profile into the doctor-side profile view.
- Access rules on patient records currently only allow the patient, the record's owning doctor, practice assistants and share recipients. Hospital staff have no read path, so even a hospital-side view would come back empty.
- Six admissions at Holarc General (Nadia Petersen, Amahle Zulu, Johan Pretorius, Kabelo Sithole, Thabo Mokoena, Lerato Nkosi) have no patient record attached at all, so their names show as plain grey text.
- There are two patient records named Georgia Adams; the admission points at one of them.

## What will change

### 1. A patient record view that lives inside the hospital profile
New screen at `/provider/hospital/patient/:patientId`, rendered inside the hospital operations layout so the sidebar, header and hospital context stay exactly as they are. It shows, read-only:
- Patient header (name, age/gender, contact) with a back link to Admissions
- Clinical Overview summary
- Personal / medical detail sections (conditions, allergies, current medications, emergency contacts)
- That patient's admission history at this hospital

Admission rows link here instead of to the doctor route. No doctor-only actions (no editing, no session recording, no documents authoring) are exposed.

### 2. Access rules for hospital staff
Add a read rule so staff of a hospital may view a patient record while that patient has an admission at their hospital, plus the same scoping for the related clinical detail the screen shows. Access ends when the admission relationship ends, and nothing is granted beyond the hospital's own admitted patients.

### 3. Repair the broken links
- Create patient records for the six unlinked Holarc General admissions and attach them, so every name in the list opens a profile.
- Match any other admission whose name already has a patient record and attach it.
- Leave the duplicate Georgia Adams records in place but keep the admission pointed at the linked one; flag the duplicate rather than deleting clinical data.

### 4. Admissions accordion restyled to match Personal Information
The Admissions list adopts the same section styling used on the patient profile's Personal Information block: a flat single frame, always-green header bar with white 12px semibold title, small icon, right-hand chevron that rotates, and the count pill. Inner per-admission rows follow the same scale so the two screens read identically.

## Technical notes

- New: `src/modules/holarchelp/pages/provider/hospital/HospitalPatientRecordScreen.tsx`; route added to `src/modules/holarchelp/routes-provider.tsx` under the hospital layout.
- `InpatientsScreen.tsx`: `recordLink` points at the hospital route; accordion classes swap to the `SectionHeader` typography/`SECTION_*` scale from `src/features/patients/components/sectionStyles.tsx`.
- Database migration: read policies on `patients` (and the clinical tables the screen reads) via a security-definer helper that checks for a current admission at the caller's hospital; plus data backfill inserting and linking the missing patient records.
- No changes to the doctor-side patient profile.
