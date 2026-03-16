

# Plan: Patient Appointment Scheduling System

## Overview

Patients can request appointments with their connected doctors by selecting available time slots, choosing a service, and submitting a request. Doctors can accept or propose alternative times. All appointments are restricted to 7:00 AM – 6:00 PM.

## 1. Database: `appointment_requests` Table

New table to manage the request/negotiation flow:

```sql
CREATE TABLE public.appointment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  service_id uuid REFERENCES public.service_prices(id),
  requested_start timestamp with time zone NOT NULL,
  requested_end timestamp with time zone NOT NULL,
  proposed_start timestamp with time zone,
  proposed_end timestamp with time zone,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, proposed, declined, confirmed
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

RLS policies:
- Patients can INSERT/SELECT their own requests (`patient_user_id = auth.uid()`)
- Patients can UPDATE (to confirm a proposed time, status = 'confirmed')
- Doctors can SELECT requests where `doctor_id = auth.uid()`
- Doctors can UPDATE (to accept/propose/decline)

When a request is **accepted**, an `appointments` table record is created automatically.

## 2. Patient Calendar Enhancement (`PatientCalendar.tsx`)

Add a "Book Appointment" button that opens a multi-step dialog:

**Step 1 — Select Doctor**: Show list of connected doctors (from `doctor_patient_access` where `is_active = true`). Display doctor name, specialty, avatar.

**Step 2 — Select Service**: Fetch `service_prices` for the selected doctor. Show service name and price. Patient picks one.

**Step 3 — Select Date & Time Slot**: 
- Show a date picker (future dates only).
- For the selected date, fetch the doctor's existing `appointments` to determine busy slots.
- Generate available 30-min slots from 7:00 AM to 5:30 PM (last slot ends at 6:00 PM).
- Grey out slots that overlap with existing appointments.
- Patient selects an available slot.

**Step 4 — Confirm & Send**: Show summary (doctor, service, date/time, price). Submit creates an `appointment_request` with status `pending` and sends a notification to the doctor.

**Time validation**: Frontend enforces 7:00–18:00 range. A database validation trigger ensures `requested_start` and `requested_end` (and proposed equivalents) fall within 07:00–18:00 local time.

## 3. Doctor Calendar Enhancement (`CalendarView.tsx`)

Add an "Appointment Requests" section/badge:
- Query `appointment_requests` where `doctor_id = auth.uid()` and `status = 'pending'`.
- For each request, show patient name, requested service, date/time.
- **Accept** button → sets status to `accepted`, creates an `appointments` record.
- **Propose New Time** → opens a mini-dialog showing the patient's existing appointments (via `appointment_requests` + `appointments` for that patient). Doctor picks a new slot (7AM–6PM enforced). Sets status to `proposed` with `proposed_start`/`proposed_end`.
- **Decline** button → sets status to `declined`.

## 4. Patient Notification for Proposed Times

When a doctor proposes a new time, a notification is created for the patient. On the patient calendar, proposed requests show with a badge. Patient can:
- **Accept proposed time** → status becomes `confirmed`, appointment record created.
- **Decline** → status becomes `declined`.

## 5. Notification Integration

Create notifications via INSERT into `notifications` table:
- When patient sends request → notify doctor
- When doctor accepts/proposes/declines → notify patient

## Files to Create/Modify

| File | Action |
|------|--------|
| SQL Migration | Create `appointment_requests` table with RLS, validation trigger |
| `src/pages/patient/PatientCalendar.tsx` | Add "Book Appointment" dialog with multi-step flow |
| `src/pages/CalendarView.tsx` | Add appointment requests panel for doctors |
| `src/App.tsx` | No changes needed (routes exist) |

