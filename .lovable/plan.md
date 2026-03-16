

# Plan: Auto-create Patient Record on Accept + Auto-apply First Consultation Fee

## 1. Auto-create Patient Record When Doctor Accepts Request

In `DoctorAccessRequests.tsx`, after the doctor accepts the request and creates the `doctor_patient_access` record, automatically create a patient record in the `patients` table for this doctor.

**In `handleAcceptRequest`**, after the access grant insert succeeds:
- Fetch the patient's profile (name, email, phone, etc.) from `profiles` table using `acceptingRequest.patient_user_id`
- Check if this doctor already has a patient record for this user (`patients` table where `user_id = doctor.id` and `patient_user_id = patient_user_id`)
- If no existing record, insert a new patient record with:
  - `user_id`: doctor's user ID (the doctor "owns" this patient record)
  - `patient_user_id`: the patient's auth user ID
  - `name`: from patient's profile `full_name`
  - `email`: from patient's profile or auth email
  - `status`: "active"

## 2. Auto-apply First Consultation Fee on First Appointment

In `BookAppointmentDialog.tsx`, when a patient selects a doctor (Step 1 → Step 2), check if the patient has any prior appointments/requests with that doctor. If this is their first appointment:
- Look for a service named like "first consultation" or "initial consultation" in the doctor's `service_prices`
- If found, auto-select it and move to Step 2 with it pre-selected (or highlight it)
- Show a note indicating this is the first visit fee

**Implementation approach**: After fetching services in `fetchServices`, also check `appointment_requests` for any prior requests between this patient and doctor. If none exist and a "first consultation" service exists, auto-select it.

To make this work, doctors need a way to designate a service as the "first consultation" fee. The simplest approach: add a `is_first_consultation` boolean column to `service_prices` table. Then the booking flow checks for it automatically.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/doctor/DoctorAccessRequests.tsx` | After accepting, create patient record for doctor |
| `src/components/appointments/BookAppointmentDialog.tsx` | Auto-select first consultation service for new patients |
| SQL Migration | Add `is_first_consultation` boolean to `service_prices` |
| `src/pages/Profile.tsx` | Add toggle for "First Consultation Fee" when creating/editing services |

## Database Migration

```sql
ALTER TABLE public.service_prices
ADD COLUMN is_first_consultation boolean NOT NULL DEFAULT false;
```

No RLS changes needed — existing policies cover service_prices.

