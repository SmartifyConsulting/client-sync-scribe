## Why his To-Do list is missing

Ifeanyichukwu has 7 pending todos in the database and `profiles.role = 'doctor'`, so the data is fine. The problem is in `src/hooks/useUserRole.ts`:

```ts
const effectiveRole: UserRole = ownsProvider ? 'emergency' : profileRole ?? ...;
```

Because he is the `owner_id` of `holarchelp_hospitals` (Stay Alive Hospital), `ownsProvider` is `true`, which **forces his effective role to `emergency`**, overriding his doctor profile. As a result:

- `isDoctor` is `false` on `/doctor-dashboard`, so `Dashboard.tsx` skips `{isDoctor && <CompactTodoList />}` (line 362).
- The same override sends him into the provider portal by default, where there is no To-Do widget at all.

Any doctor who also owns a hospital/ambulance/insurance/pharmacy hits the same bug.

## Fix

1. **`src/hooks/useUserRole.ts`** — stop forcing `emergency` when the user already has a `doctor` (or `patient`) profile. Prefer the explicit `profiles.role` and only fall back to `emergency` when no clinical role exists:

   ```ts
   const effectiveRole: UserRole =
     profileRole ??
     (normalized.includes('doctor') ? 'doctor'
       : normalized.includes('patient') ? 'patient'
       : (ownsProvider || normalized.includes('emergency')) ? 'emergency'
       : normalized.includes('admin') ? 'admin'
       : null);
   ```

   He keeps `hasEmergencyRole = true`, so the profile switcher still lets him jump to the hospital portal — but his default landing becomes the doctor dashboard where the To-Do list lives.

2. **`src/components/dashboard/CompactTodoList.tsx`** — add an explicit `.eq("user_id", user.id)` filter alongside the existing RLS, defensive against future policy widening (cosmetic, not the cause).

3. **No DB or todo-data changes** — his 7 todos are already there and visible once the gate is corrected.

## Verification

- Log in as Ifeanyichukwu → `/doctor-dashboard` renders, right column shows To-Do List with 7 active items (Review Invoice / Referral Letter / Medical Certificate / Prescription — Sharon Kennedy, plus the 3 standard follow-up tasks).
- Profile switcher still offers "Hospital portal" because `hasEmergencyRole` stays true.
- Pure doctor users and pure hospital-owner users are unaffected.
