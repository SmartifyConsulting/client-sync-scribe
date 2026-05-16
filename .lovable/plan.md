## Goal

Append doctor/practice/provider/hospital seed data to the existing patient-update plan, then execute all updates together and **report verification results**.

The earlier 3 patient-record updates + doctor links (Sharon → Xtina; Georgia → Xtina, Dean Allie; Paraskavoula → Xtina, Dean Allie, Jean Prodromos) remain unchanged in this plan.

---

## Part A — Patient records (unchanged from prior plan)

Same three `UPDATE patients` statements + three `INSERT … doctor_patient_access … ON CONFLICT DO UPDATE` upserts as previously approved.

---

## Part B — Doctor profile updates

`UPDATE public.profiles` on the three existing doctor accounts:

| Source name | Real profile id |
|---|---|
| Dr Christina Papadopoulos → **Xtina** | `ee5401ed-f435-4d95-be6c-37a7f6f69e8d` |
| Dr Dean Matthews → **Dean Allie** *(per your correction)* | `54fa34d8-9705-4407-a825-19c5756ca184` |
| Dr Jean Prothermos → **Jean Prodromos** | `a2bdfef2-e6bb-43fe-95ce-ba463c3c2cc6` |

Fields written per doctor (only those that map to real `profiles` columns):
- `specialty` (Cardiologist / Orthopedic Surgeon / Dentist)
- `doctor_number` (HPCSA: MP0721194 / MP0517750 / DT0088811)
- `practice_number` (0549987 / 0672211 / 0549987)
- `practice_address` (full street block as listed)
- `mobile_number`
- `preferred_language` (`en` — first language)
- `about_me` — short bio combining Years of Experience + Languages Spoken + Special Interests / Services Offered + Consultation Hours

Email is left untouched (each doctor already has a working auth email; source supplied none).

---

## Part C — Practices

`INSERT … ON CONFLICT (id) DO UPDATE` on `public.practices`:

1. **Sandton Heart & Dental Centre** — owner = Xtina (Christina). After insert, add Jean Prodromos as a `practice_members` row (role `partner`) so the shared practice is reflected.
2. **Johannesburg Orthopedic Institute** — owner = Dean Allie.

Both practices use deterministic UUIDs so re-runs are idempotent. No reception phone/email columns exist on `practices`, so those values go into the practice **name suffix is avoided**; instead they're written into the owner's `practice_address` (already covered in Part B) and noted in this plan only.

---

## Part D — HolarcHelp providers (hospital + ambulance)

Existing rows already present:
- `holarchelp_hospitals`: a "Zano Hospital" row owned by user `zano@smartify.co.za` (status approved).
- `holarchelp_ambulance_providers`: a "Renken Ambulance Service" row owned by `renken@smartify.co.za` (status approved).

We will **UPDATE** these in place (no new auth users) with the supplied details:

**Zano → "Zano Private Clinic"**
- `name`, `registration_number = HSP220199`
- `address = 101 Willowbrook Boulevard`, `city = Fourways`, `state = Gauteng`, `country = South Africa`
- `contact_phone = +27 11 555 4400`, `contact_email = admin@zanoclinic.test`
- `bed_capacity = 80`, `icu_capacity = 8`, `beds_available = 80`, `icu_available = 8`
- `services = {Emergency Medicine, Cardiology, Orthopedics, General Surgery, Dentistry, Radiology, Pharmacy}`
- `ownership = 'private'`, `status = 'approved'`

**Renken → "Renken ER Services"**
- `company_name`, `registration_number = EMS-778411`
- `base_address = 18 Emergency Way`, `city = Johannesburg`, `country = South Africa`
- `contact_phone = +27 11 772 4411`, `contact_email = dispatch@renkener.test`
- `status = 'approved'`

Sub-resources without columns on these tables (fleet counts, coverage areas, emergency 0861 number, "linked hospital", affiliated providers list) — **not seeded**; the schema has no place for them. Flag if you want a `notes` column added later.

---

## Part E — Out of scope (flag to seed)

- Paraskavoula's 3 historical appointments — needs `appointments` inserts tied to a specific doctor + practice + UTC start/end times.
- "Affiliated providers" linkage between Zano clinic and Drs Christina / Dean / Jean — no FK table exists for hospital↔doctor affiliation.
- Coverage area / fleet details for Renken — no columns.
- A dedicated Sharon Kennedy auth account — she currently shares Shannon's user.

---

## Execution + verification

1. Single `supabase--insert` call running, in order:
   - 3× `UPDATE patients` (Part A)
   - 3× `INSERT INTO doctor_patient_access … ON CONFLICT DO UPDATE` (Part A)
   - 3× `UPDATE profiles` (Part B)
   - 2× `INSERT INTO practices … ON CONFLICT DO UPDATE` + 1× `INSERT INTO practice_members … ON CONFLICT DO NOTHING` (Part C)
   - 1× `UPDATE holarchelp_hospitals` (Zano) + 1× `UPDATE holarchelp_ambulance_providers` (Renken) (Part D)

2. Read-back queries:
   - `SELECT … FROM patients WHERE id IN (…3 ids…)`
   - `SELECT doctor_id, patient_user_id, is_active FROM doctor_patient_access WHERE patient_user_id IN (…3 uids…)`
   - `SELECT id, full_name, specialty, doctor_number, practice_number, practice_address, mobile_number FROM profiles WHERE id IN (…3 doctor ids…)`
   - `SELECT * FROM practices ORDER BY name`
   - `SELECT name, status, registration_number, contact_email, services, bed_capacity FROM holarchelp_hospitals`
   - `SELECT company_name, status, registration_number, contact_email, base_address FROM holarchelp_ambulance_providers`

3. **Report back**: per-record checklist (✅ written / ⚠️ mismatch / ⏭️ skipped — no column) covering every supplied field across all parts, plus the final doctor-access matrix.
