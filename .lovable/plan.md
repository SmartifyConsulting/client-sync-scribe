# Doctor signup: require License + Practice Number, wire up profile-pic upload

## What the user reported

1. "Upload of profile pic failed (new row violates row-level security policy)" while on `/auth?mode=signup&role=doctor`.
2. Doctor signup must collect **Practice Number** and **License / Doctor Registration Number** alongside name / email / password, so newly registered doctors are immediately discoverable and invite-able (the "Missing registration details" toast in the attached image happens because doctors signed up without these numbers).

## Root cause

### Avatar
- `Auth.tsx` defines `uploadAvatar`, `handleAvatarChange`, `avatarInputRef`, and `avatarPreview` but never renders the UI nor calls `uploadAvatar` — so today there's no way to add a profile picture at signup.
- The `avatars` bucket exists and is public; INSERT/UPDATE/DELETE policies are correct (`auth.uid()::text = (storage.foldername(name))[1]`), but there is **no public SELECT policy**, so `getPublicUrl` returns 400s after upload even though the bucket is marked public.
- The actual RLS-violation toast comes from uploading while the freshly created auth session has not yet propagated to the storage client (no awaited `getSession()` between `signUp` and `upload`).

### License / Practice Number
- `Auth.tsx` already has `practiceNumber` / `doctorNumber` state (lines 127–128) and persists draft values (lines 196–197), but the doctor Account step UI (lines 643–740) never renders the two inputs, and `handleCompleteSignup`'s `profiles.update` (lines 383–389) never writes them.

## Plan

### 1. `src/pages/Auth.tsx` — Doctor Account step (case 0 of `renderDoctorStep`)
- Add two required `<Input>`s under Last Name (before the Email/Phone block):
  - **Practice Number** → `practiceNumber` / `setPracticeNumber`.
  - **Doctor Registration / License Number** → `doctorNumber` / `setDoctorNumber`.
- Add a circular **Profile Picture** uploader at the top of the step, using existing `avatarPreview` / `avatarInputRef` / `handleAvatarChange`. Use the project's standard Avatar + camera-icon overlay pattern (already used in MyPractice). Optional, not required.

### 2. `src/pages/Auth.tsx` — Validation
- In `handleCreateAccount` (for doctors only), after the name/email/phone checks, require non-empty `practiceNumber` and `doctorNumber`; toast and abort if either is blank.
- Validation runs before the `supabase.auth.signUp` call so no orphan auth user is created.

### 3. `src/pages/Auth.tsx` — Persistence in `handleCompleteSignup`
- After `supabase.auth.signUp` succeeds and `createdUserId` is set, await `supabase.auth.getSession()` once to make sure the access token is attached to the storage client before any upload.
- Call `uploadAvatar(userId)` (only when `avatarFile` is set) and capture `avatar_url`.
- Extend the existing `profiles.update` (around line 383) for doctors to also set:
  - `practice_number: practiceNumber.trim()`
  - `doctor_number: doctorNumber.trim()`
  - `avatar_url` (only when a file was uploaded)
- Clear `practiceNumber` / `doctorNumber` from the draft on `clearDraft`.

### 4. Migration — public read on `avatars`
Add the missing SELECT policy so `getPublicUrl` works after upload:

```sql
create policy "Public can view avatars"
on storage.objects
for select
to public
using (bucket_id = 'avatars');
```

No other storage policies change.

### 5. Out of scope
- `ProviderSignup.tsx` (hospitals / ambulances / insurance) — not mentioned by the user.
- Patient signup — practice/license numbers don't apply.
- Existing doctor accounts missing these numbers — they can fill them in via My Practice; we don't backfill.

## Verification

1. Open `/auth?mode=signup&role=doctor`. Confirm:
   - Profile-pic circle is present and previewing the chosen image.
   - Practice Number and License Number inputs are required (form blocks "Continue" until filled).
2. Complete signup with an avatar attached. After landing on `/dashboard`, the header avatar shows the uploaded image (`getPublicUrl` returns 200).
3. Query `profiles` for the new user: `practice_number`, `doctor_number`, and `avatar_url` are populated.
4. From a patient account, search the new doctor in My Doctors → click invite → "Send Request" succeeds (no "Missing registration details" toast) and Dr X receives the notification.
