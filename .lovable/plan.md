# Fix "Doctor not found" on invite

## Root cause

The `profiles` table's RLS only lets a patient SELECT a doctor's profile **after** a connection already exists (`doctor_patient_access` row, or accepted invitation). When the patient invites a new doctor, the dialog's `select id, practice_number, doctor_number from profiles where id = …` is filtered out by RLS, returns `null`, and the dialog (correctly per its current logic) shows "Doctor not found".

The search list itself works because it runs through the `search_providers` security-definer RPC, which bypasses RLS. But that RPC only returns a single combined `registration` column — and `doctor_access_requests` requires **both** `doctor_practice_number` and `doctor_registration_number` (NOT NULL), so we can't insert from the search result alone.

## Changes

### 1. Migration: add `get_doctor_invite_card` RPC
New SECURITY DEFINER function that returns the small piece of doctor info needed to send an invite, regardless of RLS:

```sql
create or replace function public.get_doctor_invite_card(_doctor_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  specialty text,
  practice_number text,
  doctor_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url, p.specialty, p.practice_number, p.doctor_number
  from public.profiles p
  where p.id = _doctor_id
    and p.role = 'doctor'::user_role
    and auth.uid() is not null
  limit 1;
$$;

grant execute on function public.get_doctor_invite_card(uuid) to authenticated;
```

No schema/table changes, no RLS changes.

### 2. `src/components/patient/InviteDoctorDialog.tsx`
- Replace the existing `from("profiles").select(...).eq("id", prefillDoctorId)` lookup with `supabase.rpc("get_doctor_invite_card", { _doctor_id: prefillDoctorId })`.
- If the RPC returns no row (and no fallback `prefillPracticeNumber`/`prefillRegistrationNumber` provided), keep the "Doctor not found" toast.
- If the resolved row is missing `practice_number` or `doctor_number`, fall back to the prefill props before erroring, and only block if both sources are empty — toast: "This provider has no registration details on file; please contact support to connect."
- Use the resolved `id` for the notification `user_id` (as today).

### 3. No change to `MyDoctors.tsx`
The page already passes `prefillDoctorId={doctor.id}`. No other props needed.

## Verification

1. Patient who has never connected to Dr Olisa opens search, clicks invite icon, sees the doctor card.
2. Click "Send Request" → toast "Request sent". A row appears in `doctor_access_requests` with Dr Olisa's practice/doctor numbers; a `notifications` row appears for Dr Olisa's user_id.
3. Log in as Dr Olisa → notification shows in the bell.

## Out of scope

- Changing `doctor_access_requests` to use a foreign key on `doctor_id` (would simplify this whole flow but requires a wider data migration).
- Other invite paths (practice partners, ESP onboarding, etc.).
