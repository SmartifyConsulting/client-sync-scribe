## Problem

The "Chronic Meds" tab in My Rewards only shows when `patients.is_chronic = true`. Marking Lion's Mane as Chronic in the daily-meds form sets `prescriptions.is_chronic = true` but never flips the flag on the patient record, so the tab stays hidden.

## Fix

1. **`src/features/patients/components/DailyMedsInline.tsx`** — after inserting a prescription where `isChronic` is true, update `patients.is_chronic = true` for that patient and invalidate the `my-chronic-patient-record` query so the tab appears immediately.

2. **`src/features/rewards/hooks/usePatientRewards.ts` (`useMyChronicPatientId`)** — treat a patient as chronic if **either** `patients.is_chronic = true` **or** they have any active chronic prescription. This self-heals existing users (like the Lion's Mane case) without a migration.

3. **One-time backfill** (data update, not a migration): set `patients.is_chronic = true` for any patient who already has an active `prescriptions.is_chronic = true` row.

No UI redesign, no schema change — purely wiring the chronic flag end-to-end.