

# Plan: Patient admission uploads, fix missing camera, Vula popup compaction, Rewards tab cleanup

## 1. Fix missing camera on Shannon Kennedy's chronic-meds tab

**Root cause:** Shannon has 3 patient records under the same auth user. `MyRewards.tsx` (line 117) picks **the newest** one (`order created_at desc`, `limit 1`) — that's "Sarah Mitchell", which is flagged chronic but has **0 active prescriptions**. The 3 active prescriptions live on the older "Shannon Kennedy" record. So `MedicationAdherenceTab` renders the empty state ("No active chronic prescriptions found") and no camera ever appears.

**Fix in `src/pages/patient/MyRewards.tsx`:** Change the patient-record query to prefer the record that **actually has active chronic prescriptions**:

```ts
// Get all of this user's patient records, then pick the one with active chronic prescriptions
const { data: patients } = await supabase
  .from("patients")
  .select("id, is_chronic")
  .eq("patient_user_id", user.id);

if (!patients?.length) return null;

const ids = patients.map(p => p.id);
const { data: rxRows } = await supabase
  .from("prescriptions")
  .select("patient_id")
  .in("patient_id", ids)
  .eq("status", "active");

const idWithRx = rxRows?.[0]?.patient_id;
return patients.find(p => p.id === idWithRx)
    ?? patients.find(p => p.is_chronic)
    ?? patients[0];
```

This guarantees the chronic-meds tab is wired to the patient record that actually has prescriptions, so the "Take Medication" buttons (which open the camera dialog at `MedicationAdherenceTab.tsx` line 378) appear.

## 2. Allow doctors **and patients** to upload admission forms

### 2a. Database — relax INSERT policy on `hospital_admissions`

Current `INSERT` policy requires `auth.uid() = doctor_id` (patients are blocked). Migration:

```sql
DROP POLICY "Doctors can insert admissions for their patients" ON hospital_admissions;

CREATE POLICY "Authorized users can insert admissions"
ON hospital_admissions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = doctor_id  -- doctor inserting their own
  AND (
    -- (a) the patient themselves: doctor_id is set to their own user_id
    EXISTS (SELECT 1 FROM patients p
            WHERE p.id = hospital_admissions.patient_id
              AND p.patient_user_id = auth.uid())
    -- (b) doctor who owns the patient record
    OR EXISTS (SELECT 1 FROM patients p
               WHERE p.id = hospital_admissions.patient_id
                 AND p.user_id = auth.uid())
    -- (c) doctor with active access
    OR EXISTS (SELECT 1 FROM patients p
               JOIN doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
               WHERE p.id = hospital_admissions.patient_id
                 AND dpa.doctor_id = auth.uid()
                 AND dpa.is_active = true)
  )
);
```

(`doctor_id` is `NOT NULL` so for patient-uploaded admissions we set `doctor_id = auth.uid()` — same actor as the inserter; the policy clause "(a) the patient themselves" allows it.)

### 2b. New "Upload Admission Form" dialog

Create **`src/components/admissions/UploadAdmissionDialog.tsx`** — modeled on `AddImagingDialog.tsx`:

- Fields: Hospital (text), Admission date (date, default today), Discharge date (optional date), Diagnosis (textarea), Procedure description (optional textarea), **Attachment** (file input — PDF / image, uploaded to `patient-media` bucket, max 5MB per existing limit).
- On Save:
  1. If a file is attached, upload to `patient-media/${user.id}/admission-${Date.now()}-${file.name}` and insert a row into `documents` (`name`, `media_url`, `patient_id`, `category = 'hospital_admission'`, `user_id = auth.uid()`) — captures the file in the patient's documents library.
  2. Insert into `hospital_admissions` with `doctor_id = auth.uid()`, `patient_id`, `document_id` (from step 1, nullable), `hospital`, `admission_date`, `discharge_date`, `diagnosis`, `procedure_description`, `status = 'admitted'` (or `'discharged'` if discharge_date set).
  3. Invalidate `["hospital-admissions", patientId]` so it appears immediately.

### 2c. Surface the upload button in `AdmissionsView`

**`src/components/admissions/AdmissionsView.tsx`:**

- Add a header row above the list with title "Hospital Admissions" and a primary `+ Upload Admission Form` button (visible whenever `canEdit` is true — both doctors and patients viewing their own record).
- Show the same button in the empty-state card (replaces the current "Entries are created automatically…" hint with a clear CTA).
- Wire the button to open the new `UploadAdmissionDialog`, passing `patientId`.
- Keep the existing auto-creation flow from `HospitalAdmissionEditor.tsx` untouched — that path still works for AI-generated forms.

### 2d. Ensure `canEdit` is true for the patient on their own record

Verify the prop wiring at the call sites:
- Patient self-view (`PatientDetailsEditor.tsx` Holarchy → Admissions tab) — pass `canEdit={true}` when the viewer is the patient (`patient_user_id === auth.uid()`).
- Doctor view — already true when the doctor has access.

## 3. Vula Vouchers popup — 30% smaller and more compact

**`src/components/rewards/VulaExplainerDialog.tsx`:**

- **Width**: `max-w-md` (448px) → `max-w-xs` (320px) — ~30% narrower.
- **Padding**: outer `p-8` → `p-5`; vertical rhythm `space-y-6` → `space-y-3`.
- **Logo**: `h-32` → `h-20`.
- **Headline**: `text-2xl` → `text-lg`; subtitle `text-sm` → `text-xs`.
- **Divider droplet badge**: `h-8 w-8` → `h-6 w-6`, icon `h-4 w-4` → `h-3 w-3`.
- **Section icon badges**: `h-11 w-11` → `h-8 w-8`, icons `h-5 w-5` → `h-4 w-4`; text `text-sm` → `text-xs`; row `gap-4` → `gap-3`.
- **Section 2**: **delete the line** "Small actions today. Bigger impact tomorrow." entirely (per request).
- **Hairline dividers** between sections retained but tighter spacing.
- **CTA button**: `h-12 text-base` → `h-10 text-sm`, `rounded-xl` retained.
- **Footer tagline**: `text-sm` → `text-xs`, heart icon `h-4 w-4` → `h-3 w-3`.

Net effect: dialog drops from ~520px tall × 448px wide to roughly ~360px × 320px — about 30% smaller in both axes, content visibly tighter.

## 4. My Rewards — remove History tab, merge Streaks into Wins

**`src/pages/patient/MyRewards.tsx`:**

- **Remove** the `<TabsTrigger value="history">` (lines 434–436) **and** the entire `<TabsContent value="history">` block (lines 776–~820). The same data is already shown as "Recent Rewards" on the Overview tab; users wanting a longer list can scroll the Overview list (still shows top 5 — leave as-is, the request only asks to remove the dedicated tab).
- **Remove** the standalone `<TabsTrigger value="streaks">` (lines 431–433).
- **Merge Streaks under Wins**: in the existing `<TabsContent value="milestones">` (the "Wins" tab, lines 557–605), append the Streaks card (the entire `<Card>` currently under `<TabsContent value="streaks">`, lines 608–679) below the milestones grid. Delete the now-empty `<TabsContent value="streaks">` wrapper.
- Final tab strip becomes: **Overview**, **Chronic Meds** (when chronic), **Wins** (milestones + streaks), **Vulas** (transfers).
- If `activeTab === "history"` or `"streaks"` is restored from prior state, fall back to `"overview"` to avoid an empty content area.

## Files touched

| File | Change |
|---|---|
| `src/pages/patient/MyRewards.tsx` | Patient-record selection prefers record with active prescriptions; remove History tab + content; remove Streaks tab trigger; move Streaks card under "Wins" tab |
| `src/components/admissions/UploadAdmissionDialog.tsx` (new) | Manual upload form — hospital, dates, diagnosis, procedure, file attachment; creates `documents` + `hospital_admissions` rows |
| `src/components/admissions/AdmissionsView.tsx` | Header row + empty-state CTA "Upload Admission Form" wired to new dialog |
| `src/components/patients/PatientDetailsEditor.tsx` | Verify/ensure `<AdmissionsView canEdit>` is true for patient self-view |
| `src/components/rewards/VulaExplainerDialog.tsx` | ~30% smaller dialog (`max-w-xs`, tighter padding/icons/text); remove "Small actions today. Bigger impact tomorrow." |
| Migration | DROP + recreate `hospital_admissions` INSERT policy to allow patients (`patient_user_id = auth.uid()`) to insert with `doctor_id = auth.uid()` |

## Out of scope
- Doctor-side admission editor (`HospitalAdmissionEditor.tsx`) — unchanged, still auto-creates admissions from session forms.
- Cleaning up Shannon's duplicate patient records — a data hygiene task, not a code change.
- Reorganising what counts as a "Win" beyond moving Streaks under it.

