## Why Sharon sees no sessions
Sharon has **19 sessions** in the database, all tied to her patient record `Sharon Elise Kennedy` (`4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb`). Each row's `user_id` is the **doctor** who recorded the consultation — not Sharon's auth user.

`src/pages/MySessions.tsx` filters with:
```ts
.eq("user_id", user.id)
```
That returns the *doctor's* sessions. For a patient it returns 0, even though RLS would happily let her read them via the "Patients can view their own sessions" policy (which joins through `patients.patient_user_id = auth.uid()`).

## Fix (single file: `src/pages/MySessions.tsx`)
Make the loader role‑aware:

1. Look up any patient records owned by the current user:
   ```ts
   const { data: myPatients } = await supabase
     .from("patients")
     .select("id")
     .eq("patient_user_id", user.id);
   const patientIds = (myPatients ?? []).map(p => p.id);
   ```
2. Build an OR query so the page works for **both** doctors and patients without a role check:
   ```ts
   let q = supabase
     .from("sessions")
     .select("id, title, status, started_at, duration_minutes, patient:patients(id, name)")
     .order("started_at", { ascending: false })
     .limit(500);
   q = patientIds.length
     ? q.or(`user_id.eq.${user.id},patient_id.in.(${patientIds.join(",")})`)
     : q.eq("user_id", user.id);
   ```
3. De‑dupe by `id` before grouping (cheap guard if a doctor is also a patient on the same session).

That's the only change. RLS already permits the reads, the bucketing/UI stays identical, no migration needed.

## Verify
- Log in as Sharon (`projectmanager@smartify.co.za`) → `/my-sessions` should show all 19 sessions grouped Today / Last week / Last month / Older.
- Log in as a doctor → still sees only their own sessions (unchanged behaviour).

Approve and I'll ship it.