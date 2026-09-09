# Provider search fix + registration / last-active columns on Users

## What I found

The Nigerian doctor the patient is looking for is on the platform: **Ifeanyichukwu Okoli** (Obstetrician/Gynaecologist, registration 23450, active). He is searchable — but only if the name is typed exactly. The search matches a plain "contains" on the full name, so "Okili" (the spelling in the request) returns nothing, and neither does searching by email or by first name plus a mistyped surname.

Two other things make the search feel broken:

- If the patient is already connected to a doctor, that doctor is silently dropped from the results, so it looks like the person doesn't exist.
- The language filter compares exact values, and profiles store language inconsistently ("en" for some, "English" for others), so picking a language can hide real doctors. Dennis Ofordum is stored as "English" and would be filtered out.

## What to change

### 1. Forgiving provider search
- Match on misspellings: use fuzzy name matching so "Okili" finds "Okoli", and match on any word of the name, not just the whole string.
- Also match on email address and on registration/practice number.
- Order results best-match first.

### 2. Don't hide people
- Show doctors the patient is already connected to in the results, marked "Already connected", instead of removing them from the list.
- When nothing matches, show a clearer empty message with the invite option next to it.

### 3. Language filter
- Treat "en" and "English" (and the other language spellings) as the same value so the filter stops hiding valid doctors.

### 4. Users screen: registration and last-active dates
- Add two columns to the admin Users table: **Registered** (the date the account was created) and **Last Active** (the last time they signed in), both formatted as short dates with "never" shown when the person has never signed in.
- Both columns sortable-friendly ordering: keep the existing newest-first default.

## Technical notes

- `public.search_providers` is rewritten: enable `pg_trgm`, match `full_name ILIKE`/word-token/`similarity()` above a threshold, plus `email` (joined from `auth.users`) and `practice_number`/`doctor_number`; return a `match_score` used for ordering. Hospital and ambulance branches get the same fuzzy name treatment.
- Language comparison normalised via a small mapping (lower-case, first two letters / known names) on both sides.
- `public.get_users_admin()` gains `last_sign_in_at` in its return type (from `auth.users`), keeping the existing admin role check.
- Frontend: `src/pages/patient/MyDoctors.tsx` (keep connected results, badge them), `src/features/admin/components/UsersTab.tsx` (two new columns + type field).
