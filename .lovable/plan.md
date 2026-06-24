# Fix doctor invitation flow

## Problem

`InviteDoctorDialog` (used from `MyDoctors` search) currently:

1. **Requires** both Practice Number and Doctor Registration Number, blocking invites when those aren't typed.
2. From the search list, `MyDoctors.tsx` (lines 454–460) passes `doctor.registration` into **both** `prefillPracticeNumber` and `prefillRegistrationNumber`. The dialog then queries `profiles` with `.eq("practice_number", X).eq("doctor_number", X)` using the same value for both columns — so the lookup returns no row, and the `notifications` insert is silently skipped. That's why Dr Olisa never gets a notification.

## Changes

### 1. `src/components/patient/InviteDoctorDialog.tsx`
- Add optional prop `prefillDoctorId?: string` (the target doctor's `profiles.id`).
- Remove the "Missing information" guard requiring both numbers.
- Remove the visible Practice Number / Registration Number `<Input>` fields and their `<Label>`s (along with the wrapping grid). Keep the prefilled doctor info card and the data-sharing transparency block.
- Replace the lookup logic in `handleSubmit`:
  - If `prefillDoctorId` is provided, use it directly as the target doctor's `profiles.id`.
  - Otherwise (legacy path, e.g. manual flow we no longer surface) fall back to the existing practice/registration lookup only when both values exist.
  - If no doctor can be resolved, toast "Doctor not found" and abort.
- Insert into `doctor_access_requests` using the resolved doctor record. Populate `doctor_practice_number` / `doctor_registration_number` from the resolved profile when available (kept for back-compat with the existing schema and the duplicate-request check), but never block on them being absent.
- Always create the `notifications` row for the resolved `doctor_id` with `type: "access_request"`, `reference_id: user.id`, the existing title/description. Surface notification errors via console + non-blocking toast instead of swallowing them silently.
- Drop the now-unused `practiceNumber` / `registrationNumber` state and the related `useEffect`.

### 2. `src/pages/patient/MyDoctors.tsx`
- In the search-result row (lines 453–460), pass `prefillDoctorId={doctor.doctor_id}` (the `profiles.id` already in the search result) instead of the bogus `prefillPracticeNumber={doctor.registration}` / `prefillRegistrationNumber={doctor.registration}` pair. Drop both incorrect props. Keep `prefillDoctorName`, `prefillAvatarUrl`, `prefillSpecialty`.

### 3. Copy
- Update `DialogDescription` to: "Send an invitation to add this healthcare provider to your panel."

## Out of scope

- Schema changes to `doctor_access_requests` (the practice/registration columns stay; we just stop *requiring* them at the UI layer).
- Other invite entry points (`PatientAccessManagement`, `MyPractice`, `Auth`, etc.) — they aren't affected by this bug.
- Realtime delivery / notification UI.

## Verification

After build:
1. From `/patient/my-doctors`, search a known doctor (Dr Olisa), click the invite (UserPlus) icon — dialog opens without the two number fields.
2. Submit → toast "Request sent"; row inserted in `doctor_access_requests` with the correct `doctor_practice_number` (from the resolved profile, if any); a `notifications` row exists for Dr Olisa's `user_id`.
3. Log in as Dr Olisa → notification visible in the bell/notifications page.
