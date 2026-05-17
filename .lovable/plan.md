## Additions to the working plan

### 6. Grant Dr Christina the same access to Shannon Kennedy that Dr Allie has (data only)

Today, the "green lock" on Shannon's My Holarchy is driven by an **accepted `doctor_access_requests` row** matched on the viewing doctor's `practice_number` + `doctor_number` (via `doctor_has_access_request_from`). Dr Allie (`54fa34d8…`, practice 985623145 / reg 7542136) has one. Dr Christina (`8dcadaba…`) has `doctor_patient_access` but no accepted access request, so no green lock.

Steps:
- Read Dr Christina's `profiles.practice_number` and `profiles.doctor_number`.
- Insert one row into `doctor_access_requests` for Shannon (`96740682…`):
  - `patient_user_id = 96740682-20a5-4b6c-99a0-d26c5d4d20c9`
  - `patient_name = 'Shannon Kennedy'`
  - `doctor_practice_number` / `doctor_registration_number` = Christina's values
  - `status = 'accepted'`
- Ensure Christina's existing `doctor_patient_access` row for Shannon stays `is_active = true` (already true; no change).
- No code or schema changes.

Verification: log in as Dr Christina → open Shannon's My Holarchy → green lock should display, identical to Dr Allie.

### 7. Merge Shannon Kennedy into Sharon Elise Kennedy (data only)

Two distinct user accounts exist:
- Shannon Kennedy — `user_id 96740682-20a5-4b6c-99a0-d26c5d4d20c9`, two patient records (`30cadfb3…` legacy with NULL `patient_user_id`, and `6bab47a6…` current).
- Sharon Elise Kennedy — `user_id cf9b1db5…`, one patient record (`bc6973cc…`).

The user has confirmed these are the same person. Treat **Sharon Elise Kennedy (`cf9b1db5…` / patient `bc6973cc…`) as the surviving canonical profile**.

Steps:
1. **Audit Shannon's clinical data** across patient-scoped tables (prescriptions, sessions, hospital_admissions, patient_documents, patient_media, patient_rewards, patient_tasks, prescription_pill_references, blood_donations, doctor_patient_checkins, notifications, patient_profile_shares, etc.) keyed by either `patient_id` ∈ {`30cadfb3…`, `6bab47a6…`} or `patient_user_id`/`user_id` = `96740682…`.
2. **Re-parent** all those rows to the surviving Sharon record:
   - `patient_id → bc6973cc-e8ca-45b0-9fbd-0879e8ad41f7`
   - `patient_user_id / user_id → cf9b1db5-eef9-46c8-9f5d-b571630355aa`
3. **Re-parent Dr Christina's and Dr Allie's `doctor_patient_access`** rows so they now point at Sharon's `patient_user_id` (skip if a duplicate already exists for that doctor+patient).
4. **Update `doctor_access_requests`** for Shannon → `patient_user_id = cf9b1db5…`, `patient_name = 'Sharon Elise Kennedy'` (including the new Christina row from step 6).
5. **Delete** the two Shannon patient rows (`30cadfb3…`, `6bab47a6…`) after all FK references are moved.
6. **Soft-archive Shannon's auth profile**: set `profiles.full_name = 'Sharon Elise Kennedy (merged)'`, `profiles.status = 'merged'` for `96740682…`. Do NOT delete the auth user (would break audit history and any orphaned FK we missed).
7. Optional: add a note row (e.g. in `notifications` to Sharon) explaining the merge timestamp.

No code or schema changes; all done via reversible insert/update tool calls executed in a single transaction script.

### Execution order

This merge (item 7) must run **after** the Christina access grant (item 6), so the new `doctor_access_requests` row gets re-pointed in step 4 along with the rest.