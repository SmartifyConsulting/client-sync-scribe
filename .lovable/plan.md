

# Plan: Make Shannon's chronic meds visible and actionable on Rewards

## Root cause

Shannon **does** have 3 active chronic prescriptions (Sertra 50mg, melatonin 100mg, Dormanoct) on patient record `bc6973cc...`. The network logs confirm they load successfully on `/patient/rewards`. The problem is **discoverability** — they live behind a separate "Chronic Meds" tab that:

1. Only appears when `patientRecord.is_chronic === true`, and the wrong record can be picked when a user has multiple patient rows.
2. Is not opened by default — the page lands on "Overview", which has zero medication context, so it looks empty.
3. Has no surfacing on the Overview hero — patients don't know to switch tabs.

Also, Shannon now has **3 patient records** (the editor's chronic→prescriptions sync from the previous plan keeps creating copies instead of consolidating), which makes the patient-record-picker brittle.

## Fix 1 — Always land on Chronic Meds when patient is chronic

In `src/pages/patient/MyRewards.tsx`:

- Change the default tab: when the resolved `patientRecord?.is_chronic === true`, initialise `activeTab` to `"chronic-meds"` instead of `"overview"`.
- Persist last-viewed tab in `localStorage` so navigation between sessions remembers their preference, but for a chronic patient with **at least one active prescription** the first visit defaults to Chronic Meds.

## Fix 2 — Surface a "Today's medications" card on the Overview tab

So the meds are visible even without changing tabs. In `MyRewards.tsx` Overview pane, add a new `TodaysMedicationsCard` that:

- Queries `prescriptions` for `patient_id = patientRecord.id`, `status = 'active'`.
- Shows each med as a row: name · dosage · frequency, plus a primary **Take Medication** button (or **Set up baseline** when no `prescription_pill_references` row yet).
- Clicking the button switches `activeTab` to `"chronic-meds"` and sets a `?focus={rxId}` query param so `MedicationAdherenceTab` auto-scrolls and opens the recorder for that prescription.
- Empty state: "No active chronic medications. Ask your doctor to add one."

This card sits at the top of Overview, above "Recent Rewards", so a chronic patient sees their meds the moment Rewards opens — even if the default-tab change above is reverted later.

## Fix 3 — Robust patient-record selection

The current selector in `MyRewards.tsx` (lines 108–136) prefers the patient record that has active prescriptions, then any chronic one, then newest. This is correct but fragile when duplicates exist. Tighten it:

- Run **one** query that joins-in-application: select all of the user's patient rows, plus all active prescriptions for those rows, plus all `medication_adherence` rows for today. Pick the patient record with the highest count of active prescriptions; tie-break by most recent adherence activity, then `is_chronic`, then newest `created_at`.
- Add a one-line dev console log (gated by `import.meta.env.DEV`) showing which patient_id was chosen and why, so future "I can't see my meds" reports are diagnosable in 5 seconds.

The same picker is exposed as a tiny hook `useMyChronicPatientId()` in `src/hooks/usePatientRewards.ts` so `MyRewards`, `TodaysMedicationsCard`, and `MedicationAdherenceTab` all agree on the chosen record.

## Fix 4 — Prevent duplicate patient records on signup/edit

Audit `src/components/patients/PatientDetailsEditor.tsx` `handleSave` (the chronic→prescriptions sync added previously) to ensure it does **not** create a new `patients` row when the patient edits their own self-record. The save path must always `update` an existing row matched by `id`, never `insert`. Add an explicit guard:

```ts
if (!patientId) {
  toast({ title: "Cannot save without a patient record", variant: "destructive" });
  return;
}
```

Then add a one-off cleanup migration that:
- For each `patient_user_id`, keeps the row that has the most prescriptions (or, if tied, the oldest), and merges `current_medications`, `chronic_medications`, `is_chronic`, and `conditions_diagnoses` from the duplicates into it.
- Reassigns any `prescriptions`, `medication_adherence`, `health_photos`, `documents`, `appointments`, `hospital_admissions`, `patient_rewards`, `image_comparisons`, `invoices`, `appointment_requests`, `emoticon_messages`, and `messages` rows that point at a duplicate `patient_id` over to the surviving row.
- Soft-deletes the duplicates by setting `status = 'archived'` (rather than `DELETE`, to preserve history).

For Shannon specifically the cleanup will collapse her 3 records (`30cadfb3`, `bc6973cc`, `a1b2c3d4`) down to `bc6973cc` (the one with prescriptions), and her chronic meds will become unambiguous everywhere.

## Fix 5 — Show the legacy `dosage` clearly

Two of Shannon's prescriptions have empty/odd `dosage` ("Dormanoct" has none; "Sertra" shows "daily, Monday to Friday" inside `frequency`). In the Chronic Meds list and the new Overview card, render:

```
Sertra · 50mg · daily, Monday to Friday   [Active] [Chronic]
Dormanoct · — · once daily                [Active] [Chronic]
```

with an em-dash for missing dosage and a small **"Update dosage"** link (visible only to the patient on her own record) that opens the `PatientDetailsEditor` medication edit dialog focused on that med.

## Files touched

| File | Change |
|---|---|
| `src/pages/patient/MyRewards.tsx` | Default to `chronic-meds` tab when chronic; add `TodaysMedicationsCard` to Overview; use new `useMyChronicPatientId` hook. |
| `src/components/rewards/TodaysMedicationsCard.tsx` *(new)* | List of today's chronic prescriptions with **Take Medication** / **Set up baseline** buttons, jumps to Chronic Meds tab. |
| `src/hooks/usePatientRewards.ts` | New `useMyChronicPatientId()` hook with robust selection + dev log. |
| `src/components/rewards/MedicationAdherenceTab.tsx` | Honour `?focus={rxId}` query param: scroll to that prescription card and open recorder/baseline if pending. Render `dosage` with em-dash fallback. |
| `src/components/patients/PatientDetailsEditor.tsx` | Insert/update guard so patients can never accidentally create duplicate `patients` rows. |
| Migration | One-off cleanup: dedupe `patients` per `patient_user_id`, reassign all child rows to the survivor, archive the rest. |

## Out of scope

- Removing the Chronic Meds tab — keep it for a focused workspace and for the monthly summary on Wins & Streaks.
- Doctor-side tooling to manage patient-record duplicates (covered by the migration for now; we can add an admin tool later if it recurs).
- Backfilling missing `dosage`/`frequency` on existing prescriptions — surfaced via the "Update dosage" link instead.

