# Merge Admissions and Inpatients into one record

Today there are two parallel admission records: the patient-side clinical admission (`hospital_admissions`, 6 rows, used by My Admissions / Doctor Admissions) and the hospital-side bed board (`hospital_inpatient_admissions`, 21 rows, used by the hospital Inpatients screen). They never talk to each other, so a doctor-created admission never appears in the hospital's ward list.

This plan collapses them into a single admission record, adds an insurance authorisation status for the hospital view, records the admitting doctor, and reworks the Admissions detail UI from stacked accordions into tabs.

## One admission record

The patient-side table becomes the single source of truth and absorbs the hospital-operations fields:

- Ward, bed number, hospital provider link, admitted/discharged timestamps
- Free-text patient name and patient user link, so hospitals can still admit someone who has no Holarc account
- Source of the admission (walk-in, emergency, referral, elective) and the originating emergency incident

The 21 existing bed-board rows are migrated across, keeping their ward, bed, attending doctors and nurse assignments intact. Attending-doctor, nurse-assignment and ward-transfer records are repointed to the merged record. The old table is left in place, empty and unused, until the new flow is confirmed working.

## Authorisation status

Every admission gains an authorisation state, shown as a badge in the hospital view:

- **Authorised** — cleared to occupy a bed. Default for public/state hospitals and for admissions the hospital itself creates at the front desk.
- **Pending** — a doctor booked the admission from the patient's profile at a private hospital and medical insurance has not confirmed yet.
- **Declined** — insurance refused; the row stays visible with the reason.

Whether a hospital defaults to Pending or Authorised is driven by the hospital's own private/public flag, so no one has to remember to set it. Hospital admin staff can move an admission between states and record who authorised it and when. The hospital Inpatients list gets a filter so staff can work the Pending queue separately from live beds.

## Admitted by

Each admission shows the admitting doctor by name — resolved from the doctor who created it, or chosen from the hospital's affiliated doctors when the hospital admits directly. This appears in the hospital list, the patient's admission card and the wristband QR.

## Admissions detail becomes tabbed

The admission detail currently stacks seven collapsible sections. It becomes a tab strip:

```text
Patient Overview | Vitals | Medications | Labs | Imaging | Diet & Meals | Shift Log
```

**Patient Overview** is a new first tab, populated directly from the database — no AI, no free text:

- Patient identity, age, blood type, allergies
- Admitting doctor, doctor on call, hospital, ward and bed
- Admission date, expected/actual discharge, authorisation badge
- Reason for admission, diagnosis, procedure
- Next of kin and emergency contact
- Latest vitals reading and count of active medications

The remaining tabs carry over the existing section content unchanged, keeping the current add-dialogs and the nurse rating control.

## Technical notes

- Migration: add `ward_id`, `bed_number`, `hospital_id`, `patient_user_id`, `patient_name`, `incident_id`, `admitted_at`, `discharged_at`, `authorisation_status`, `authorised_by`, `authorised_at`, `admitted_by_doctor_id` to `public.hospital_admissions`; backfill from `hospital_inpatient_admissions`; repoint `hospital_attending_doctors`, `hospital_nurse_assignments`, `hospital_ward_transfers` foreign keys.
- RLS: add a hospital-member policy so staff at `hospital_provider_id` can read and update admissions at their own hospital, and restrict authorisation-status changes to hospital admins via a trigger. Existing doctor and patient policies stay as-is.
- `useHospitalInpatients` reads from `hospital_admissions` filtered by hospital and non-discharged status; `useHospitalAdmissions` is unchanged in shape.
- `InpatientsScreen` gains an authorisation column and status filter; `InpatientDialogs` writes to the merged table.
- `AdmissionsView` swaps `Collapsible` sections for the shared tab component, with a new `AdmissionPatientOverviewTab` component.
