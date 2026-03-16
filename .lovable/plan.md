

# Plan: Chronic Medication Adherence Tab in My Rewards

## Overview

Add a "Chronic Medication" tab under My Rewards that tracks medication adherence for chronic patients. When a doctor prescribes chronic medication, a daily adherence task is auto-assigned. Patients must film themselves taking medication. Missed doses alert the doctor, and streak achievements trigger a one-click congratulations flow that awards 250 Moolas to both doctor and patient.

## Database Changes

**Migration SQL:**

```sql
-- Table to track daily medication adherence logs
CREATE TABLE public.medication_adherence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  taken_at timestamptz,
  proof_url text,
  status text NOT NULL DEFAULT 'pending', -- pending, completed, missed
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, prescription_id, scheduled_date)
);
ALTER TABLE public.medication_adherence ENABLE ROW LEVEL SECURITY;

-- Patients can view/insert their own adherence
CREATE POLICY "Patients can view own adherence" ON public.medication_adherence
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.patient_user_id = auth.uid()));

CREATE POLICY "Patients can insert own adherence" ON public.medication_adherence
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.patient_user_id = auth.uid()));

CREATE POLICY "Patients can update own adherence" ON public.medication_adherence
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.patient_user_id = auth.uid()));

-- Doctors can view adherence for their patients
CREATE POLICY "Doctors can view patient adherence" ON public.medication_adherence
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid()));

-- Table for doctor congratulations (prevents duplicates, tracks rewards)
CREATE TABLE public.doctor_congratulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  streak_type text NOT NULL, -- e.g. 'medication_adherence'
  streak_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_congratulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view their congratulations" ON public.doctor_congratulations
  FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can insert congratulations" ON public.doctor_congratulations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);

-- Add gamification config entry for "Acknowledgement of Achievement" (250 moolas)
INSERT INTO public.gamification_config (visit_category, lollipops_awarded, description, is_active)
VALUES ('Acknowledgement of Achievement', 250, 'Awarded when doctor congratulates patient on medication streak', true);
```

## File Changes

### 1. `src/pages/patient/MyRewards.tsx`
- Add a **"Chronic Meds"** tab after "Assigned Tasks"
- Fetch patient's active chronic prescriptions (where patient `is_chronic = true` and prescription `status = 'active'`)
- For each medication, show: name, dosage, frequency, today's adherence status
- Show a **camera icon** button to film proof of taking medication today
- Display a streak counter (consecutive days taken)
- Show adherence calendar/progress for the current month

### 2. New Component: `src/components/rewards/MedicationAdherenceTab.tsx`
- Fetches `medication_adherence` records for the patient
- Shows each active chronic prescription as a card with:
  - Medication name, dosage, frequency
  - Today's status (pending/completed/missed)
  - Current streak count
  - "Take Medication" button with camera icon → opens `ActivityProofCapture`
- On video submission: inserts into `medication_adherence` with `status='completed'` and `proof_url`
- Awards Moolas for daily adherence (reuses existing gamification config)

### 3. Doctor-Side: Missed Dose Notifications
**File:** `src/components/sessions/PrescriptionEditor.tsx` (or wherever prescriptions are created)
- When a chronic prescription is saved, auto-create a recurring `todos` entry for the patient with `task_type = 'medication'`

**File:** New edge function or cron-like check (simplified approach): 
- On the patient's MyRewards page load, check if yesterday's doses were missed (no `medication_adherence` record) and insert a notification to the doctor
- When patient opens Chronic Meds tab: auto-create today's pending adherence records if not yet created

### 4. Doctor Notifications & Congratulations
**File:** `src/components/patients/PatientOverview.tsx` or patient detail page
- When viewing a chronic patient, show their medication adherence streak
- Show a **"Congratulate"** button when streak >= 7 days
- Clicking it:
  1. Inserts into `doctor_congratulations`
  2. Awards 250 Moolas to patient (`patient_rewards` insert)
  3. Awards 250 Moolas to doctor (new `doctor_rewards` or via `patient_rewards` with doctor reference)
  4. Sends notification to patient: "Your doctor congratulated you on your X-day medication streak!"
  5. Shows toast to doctor confirming the congratulation

### 5. Auto-Assignment of Medication Tasks
**File:** `src/components/sessions/PrescriptionEditor.tsx`
- On saving a prescription for a chronic patient, insert a `todos` record:
  - `title`: "Take [medication name] - [dosage]"
  - `task_type`: "medication"
  - `patient_id`: the patient's ID
  - `moolas_reward`: from gamification config
- Also notify the patient about the new medication adherence task

## Files Summary

| File | Change |
|------|--------|
| Database migration | Create `medication_adherence`, `doctor_congratulations` tables; insert gamification config |
| `src/pages/patient/MyRewards.tsx` | Add "Chronic Meds" tab |
| `src/components/rewards/MedicationAdherenceTab.tsx` | New component for medication tracking UI |
| `src/components/patients/PatientOverview.tsx` | Add adherence streak display + Congratulate button for chronic patients |
| `src/components/sessions/PrescriptionEditor.tsx` | Auto-assign medication task on chronic prescription save |

