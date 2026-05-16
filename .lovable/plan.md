# Plan: Finish remaining seed + schema gaps

## 1. Paraskavoula's 3 historical appointments

Insert into `public.appointments` (`start_time`/`end_time`, type defaults to `session`, `user_id` = doctor, `patient_id` = `67ea0671…`).

| # | Date (09:00–09:30 UTC) | Title | Doctor (`user_id`) |
|---|---|---|---|
| 1 | 2026-01-14 | Cardiology Review — Dr Christina | `ee5401ed…` |
| 2 | 2026-02-10 | Orthopedic Consultation — Dr Dean Allie | `54fa34d8…` |
| 3 | 2026-03-04 | Dental Cleaning — Dr Jean Prodromos | `a2bdfef2…` |

Location = doctor's practice address. `description` flags it as historical seed.

## 2. Hospital ↔ Doctor affiliation FK

Migration — new table:

```sql
CREATE TABLE public.hospital_doctor_affiliations (
  id uuid PK default gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES holarchelp_hospitals(id) ON DELETE CASCADE,
  doctor_id  uuid NOT NULL REFERENCES profiles(id)              ON DELETE CASCADE,
  role text, department text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (hospital_id, doctor_id)
);
```
RLS: SELECT authenticated; write = `is_hospital_staff()` OR admin.

Seed: ZA Private Clinic (`8bab7ca0…`) ↔ Christina (Cardiology), Dean Allie (Orthopedics), Jean (Dentistry).

## 3. Renken — coverage areas, fleet, emergency line

Migration — two tables + column:

```sql
CREATE TABLE public.ambulance_fleet (
  id uuid PK, provider_id uuid NOT NULL REFERENCES holarchelp_ambulance_providers(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL, count integer NOT NULL DEFAULT 0, notes text,
  UNIQUE (provider_id, vehicle_type)
);
CREATE TABLE public.ambulance_coverage_areas (
  id uuid PK, provider_id uuid NOT NULL REFERENCES holarchelp_ambulance_providers(id) ON DELETE CASCADE,
  area_name text NOT NULL, region text, country text,
  UNIQUE (provider_id, area_name)
);
ALTER TABLE public.holarchelp_ambulance_providers ADD COLUMN emergency_phone text;
```
RLS: SELECT authenticated; write = `is_ambulance_staff()` OR admin.

Seed Renken (`49968d4c…`): `emergency_phone='0861 RENKEN'`; Fleet ALS×5, BLS×12, RRV×3; Coverage: Sandton, Rosebank, Midrand, Fourways, Randburg, Johannesburg CBD (Gauteng, ZA).

## 4. Dedicated Sharon Kennedy auth account

a. One-shot edge function `seed-sharon-user` → `auth.admin.createUser({ email:'sharon.kennedy@testmail.com', password:'Sharon!Test2026', email_confirm:true, user_metadata:{ full_name:'Sharon Elise Kennedy', role:'patient' }})`. Uses existing `SUPABASE_SERVICE_ROLE_KEY`. `handle_new_user` trigger auto-creates profile + user_roles row.

b. Re-parent Sharon's patient record off Shannon (`96740682…`):
```sql
UPDATE patients SET user_id = <new>, patient_user_id = <new> WHERE id='bc6973cc…';
```
c. Re-point `doctor_patient_access` rows for Sharon's doctor (Christina) from Shannon's uid → Sharon's new uid.

## 5. Rename "Zano Private Clinic" → "ZA Private Clinic"

```sql
UPDATE public.holarchelp_hospitals
SET name = 'ZA Private Clinic', updated_at = now()
WHERE id = '8bab7ca0-0e5c-4835-93c1-815d121c5326';
```
Also rg the codebase for hard-coded "Zano" references; replace any seed/test strings found. The string already updated in `.lovable/plan.md` (use "ZA Private Clinic" going forward).

## 6. Verification & report

Per-item PASS/FAIL with read-back rows: appointments (3), affiliations (3), Renken fleet (3) + coverage (6) + emergency_phone, Sharon new uid + re-parented patient + re-pointed access, ZA Private Clinic name.

## Execution order

1. Migration (sections 2 & 3 tables + RLS).
2. Edge function deploy + invoke; capture Sharon's new uid.
3. Data seed via `supabase--insert` (appointments, affiliations, fleet, coverage, Sharon re-parent, ZA rename).
4. Verification queries + final report.
