

# Comprehensive Feature Update Plan

This plan covers 12 major changes: patient details reorganization, document alias auto-generation, partner invite button, voice selection, auto-generated clinical documents from transcription, referral doctors screen, CPD certificates screen, and improved patient import preview.

---

## 1. Reorganize Patient Details Frames

**File: `src/components/patients/PatientDetailsEditor.tsx`**

Reorder both view and edit mode sections to this sequence:
1. **Personal Information** — Name, ID, Gender, DOB, Email, Phone, Marital Status, Referred By (remove Occupation and Employer from here)
2. **Addresses** — Physical Address + Postal Address (rename from "Address" to "Addresses")
3. **Next of Kin** — unchanged
4. **Employer** — new standalone frame with Employer and Occupation fields (moved from Personal Information)
5. **Medical Insurance** — rename from "Medical Data"; remove Allergies, GP, Pharmacy, Surgery from this section. Keep: Insurance Provider, Product, Number, Primary Member, Claims Email, GP
6. **Pharmacies** — new frame. Convert single pharmacy to a list stored as JSONB. Each pharmacy has name, email, and `is_primary` boolean. Allow adding/removing pharmacies and toggling primary.
7. **Physical Measurements** — Height, Weight, BMI (already exists, just reposition)
8. **Allergies** — standalone frame (move out of Medical Insurance)
9. **Surgeries and Dates** — standalone frame (move out of Medical Insurance)
10. **General Notes** — unchanged, stays at bottom

**Database Migration:**
```sql
ALTER TABLE patients ADD COLUMN pharmacies jsonb DEFAULT '[]'::jsonb;
```
Migrate existing `pharmacy_name`/`pharmacy_email` into `pharmacies` array on first load (client-side migration in the hook).

**File: `src/hooks/usePatients.ts`** — Add `pharmacies` to Patient interface as `Pharmacy[]` type. Update `toPatient`/`toDbPatient` to handle the JSONB array.

---

## 2. Auto-Generate Document Alias Address

**File: `src/hooks/useProfile.ts` or `src/pages/Auth.tsx`** — After signup, when profile is created, auto-generate a `mailbox_alias` from `firstname-lastname-YYYY` (year of birth from DOB or registration year). Store it in profiles table.

**Database Migration:**
No schema change needed — `mailbox_alias` already exists on profiles.

**File: `src/pages/Auth.tsx`** — After user creation, set `mailbox_alias` to `{firstname}-{lastname}-{year}` (lowercase, hyphens). Handle conflicts by appending a number.

---

## 3. Show Alias on Documents Tab

**File: `src/pages/PatientProfile.tsx`** — In the Documents tab, add an info banner showing:
> "Documents can be emailed to your documents tab by external parties (e.g., radiologists, labs) to **docs-{alias}@inbox.medipad.health** and they will be saved under your Documents."

Fetch the doctor's actual `mailbox_alias` or `mailbox_id` from profiles and display the real address.

---

## 4. Partner Invite Button

**File: `src/pages/Profile.tsx`** — In the partners list, add a small "Send Invite" icon button next to each existing partner (for re-sending invitations). Currently invitations are only sent on initial add. The icon will call `send-user-invitation` edge function with the partner's email.

---

## 5. Narration Voice Selection in Profile

**File: `src/pages/Profile.tsx`** — Add a "Narration Voice" section under Personal Information. Offer a dropdown with OpenAI TTS voices: `alloy`, `echo`, `fable`, `nova`, `onyx`, `shimmer`. Save to `profiles.narration_voice`.

**Database Migration:**
```sql
ALTER TABLE profiles ADD COLUMN narration_voice text DEFAULT 'nova';
```

**File: `src/components/dashboard/TodaysBriefing.tsx`** — Pass the selected voice to `narrate-briefing` edge function.

---

## 6. Auto-Generate Medical Certificate from Transcription

**File: `supabase/functions/summarize-session/index.ts`** — Extend the AI prompt to also detect if a medical certificate / sick note / leave of absence is discussed. Return a `medical_certificate` field with patient name, dates, and reason.

**File: `src/pages/Sessions.tsx`** — After session completion, if `medical_certificate` is returned, auto-generate a document using the Medical Certificate template and save it. Show a toast notifying the doctor.

---

## 7. Auto-Generate Prescription from Transcription

**File: `supabase/functions/summarize-session/index.ts`** — Extend to detect prescriptions discussed. Return a `prescription` field with medications, dosages, frequencies.

**File: `src/pages/Sessions.tsx`** — After session completion, if `prescription` data is returned, show a review dialog pre-filled with the extracted prescription data. Doctor can edit and approve. On approval, save as document and optionally send to patient/pharmacy.

---

## 8. Auto-Generate Invoice from Transcription

**File: `supabase/functions/summarize-session/index.ts`** — Extend to detect billing/invoice discussions. Return an `invoice` field with services and amounts.

**File: `src/pages/Sessions.tsx`** — After session completion, if `invoice` data is returned, show a review dialog pre-filled with extracted invoice items. Doctor can edit and approve. On approval, create invoice record.

---

## 9. Auto-Generate Referral Letter from Transcription

**File: `supabase/functions/summarize-session/index.ts`** — Extend to detect referral discussions. Return a `referral` field with specialist name, reason, and urgency.

**File: `src/pages/Sessions.tsx`** — After session completion, if `referral` data is returned, show a review dialog pre-filled with referral details. Doctor approves, document is saved and optionally sent to patient.

---

## 10. Referral Doctors Screen

**Database Migration:**
```sql
CREATE TABLE referral_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  practice_number text,
  address text,
  email text,
  phone text,
  referral_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE referral_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their referral doctors" ON referral_doctors FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**New File: `src/pages/ReferralDoctors.tsx`** — CRUD screen for managing referral doctors. Displays a table with all fields and a referral count column. Add/edit/delete functionality.

**File: `src/App.tsx`** — Add route `/referral-doctors`.
**File: `src/components/layout/Sidebar.tsx`** — Add "Referral Doctors" nav item for doctors.

---

## 11. CPD Certificates Screen

**Database Migration:**
```sql
CREATE TABLE cpd_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  certificate_name text NOT NULL,
  issuing_body text,
  date_earned date NOT NULL,
  cpd_points integer DEFAULT 0,
  certificate_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE cpd_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their CPD certificates" ON cpd_certificates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**New File: `src/pages/CPDCertificates.tsx`** — Screen to capture training certificates and CPD points. Shows total CPD points as a badge.

**File: `src/App.tsx`** — Add route `/cpd-certificates`.
**File: `src/components/layout/Sidebar.tsx`** — Add "CPD" nav item for doctors.
**File: `src/pages/Dashboard.tsx`** or Profile — Show CPD points badge on doctor's dashboard/profile.

---

## 12. Improved Patient Import Preview

**File: `src/components/patients/PatientImport.tsx`**

Make the preview table fully interactive:
- Use `ScrollArea` with both horizontal and vertical scrolling (already has vertical, add horizontal)
- Show ALL parsed fields as columns (not just 6)
- Make cells **editable** — clicking a cell turns it into an input field
- Add delete button per row to remove records before import
- State updates to `parsedPatients` array on cell edit
- Increase preview height from 300px to 500px for better visibility

---

## Database Migrations Summary

```sql
-- Pharmacies JSONB array
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pharmacies jsonb DEFAULT '[]'::jsonb;

-- Narration voice preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS narration_voice text DEFAULT 'nova';

-- Referral doctors table
CREATE TABLE referral_doctors (...);
-- RLS policies

-- CPD certificates table  
CREATE TABLE cpd_certificates (...);
-- RLS policies
```

## Files Affected

| Change | Files |
|---|---|
| Reorganize details | `PatientDetailsEditor.tsx`, `usePatients.ts`, migration |
| Document alias | `Auth.tsx`, `PatientProfile.tsx` |
| Partner invite | `Profile.tsx` |
| Voice selection | `Profile.tsx`, `TodaysBriefing.tsx`, `narrate-briefing/index.ts`, migration |
| Auto med cert | `summarize-session/index.ts`, `Sessions.tsx` |
| Auto prescription | `summarize-session/index.ts`, `Sessions.tsx` |
| Auto invoice | `summarize-session/index.ts`, `Sessions.tsx` |
| Auto referral | `summarize-session/index.ts`, `Sessions.tsx` |
| Referral doctors | New `ReferralDoctors.tsx`, `App.tsx`, `Sidebar.tsx`, migration |
| CPD certificates | New `CPDCertificates.tsx`, `App.tsx`, `Sidebar.tsx`, `Dashboard.tsx`, migration |
| Import preview | `PatientImport.tsx` |

