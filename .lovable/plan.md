## Diagnosis

**1. Why Dr Gianna sees no hospitals**

`HospitalAffiliations.tsx` reads from the view `public.holarchelp_hospitals_public`, and `HospitalsDirectoryScreen.tsx` reads from `public.holarchelp_hospitals` directly.

- The **view has no `GRANT SELECT`** to `authenticated` or `anon` — only `sandbox_exec`. PostgREST therefore returns 0 rows to every logged-in doctor. This is the primary cause. All 100 approved hospitals exist in the table but are unreachable from the client.
- The **base table's RLS** only allows the hospital owner, hospital admins, and platform admins to `SELECT`. So the directory screen also returns 0 to any non-owner doctor.

**2. Why patients can't find Dr Gianna**

Her `profiles` row (`132ab89a-…`) is a real doctor (`role='doctor'`, `user_roles.role='doctor'`), but `profiles.specialty` is `NULL`. Her about_me says "Physiotherapist…" but that field isn't indexed by search.

- The `search_providers` RPC finds her by **name** (confirmed via a simulated authenticated call — she returns).
- She is **excluded any time a patient filters by specialty**, because the RPC does `p.specialty ILIKE '%…%'` and hers is null. Most patients discover doctors by specialty, not by exact name.
- Separately, `ReferralDoctors.tsx` searches `profiles` directly, and `profiles` RLS only lets patients see doctors they're already **connected to** — so she never appears there for a new patient. This is a pre-existing limitation of that screen (not Gianna-specific), worth noting but not part of this fix.

## Fix

### 1. Migration — expose approved hospitals to authenticated users

```sql
GRANT SELECT ON public.holarchelp_hospitals_public TO authenticated, anon;

-- Also allow any authenticated user to read approved hospitals from the base
-- table so the ambulance/ER directory screen works. Sensitive owner-only
-- columns are already excluded from the _public view; the base-table policy
-- below only exposes approved rows.
CREATE POLICY "Authenticated users can view approved hospitals"
  ON public.holarchelp_hospitals
  FOR SELECT
  TO authenticated
  USING (status = 'approved');
```

### 2. Data fix — set Gianna's specialty

Update her profile so specialty-filtered searches surface her (derived from her own about_me):

```sql
UPDATE public.profiles
SET specialty = 'Physiotherapist'
WHERE id = '132ab89a-572a-4f31-ba61-27ab750cc709'
  AND (specialty IS NULL OR specialty = '');
```

No code changes required — `search_providers` already returns her by name today, and once `specialty` is populated she'll match `Physiotherapist` filters.

## Out of scope (flagged, not fixed here)

`ReferralDoctors.tsx` cannot find any unconnected doctor for a patient because `profiles` RLS restricts patient reads to connected doctors only. If you want patients to discover doctors from that screen too, we'd swap that lookup to the `search_doctor_profiles` RPC in a follow-up.
