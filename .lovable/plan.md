## 1. Sharon can't see the hospital admission

Root cause (verified in DB):
- Sharon's real auth account is `sharon.kennedy@testmail.com` (id `cf9b1db5…`). Her only patient row `bc6973cc…` is archived and has no admissions.
- The active clinical row `Sharon Elise Kennedy` (id `4b1032be…`) — the one Dean added the admission to — is linked to a different auth user (`projectmanager@smartify.co.za`, id `96740682…`), so when the real Sharon logs in, `MyDetails.fetchPatientRecord()` (matching by `patient_user_id = auth.uid()`) lands on the empty archived row.

Fix:

**a) Data reconciliation (insert/update tool)**
- Re-parent the active clinical row: `UPDATE patients SET patient_user_id = 'cf9b1db5…' WHERE id = '4b1032be…'`.
- Null the `patient_user_id` on the empty archived duplicate `bc6973cc…` so it can't shadow the real one.

**b) Defensive fetch in `src/pages/patient/MyDetails.tsx`**
- Prefer `patient_user_id = user.id AND status <> 'archived'` ordered by newest `updated_at`.
- Fallback: match by `lower(email) = lower(user.email)` on a non-archived row; if found, patch that row's `patient_user_id` to the current user so future logins self-heal.
- Keep the "create minimal row" branch only when both lookups fail.

Sharon then sees the admission in both `?section=health` (existing `<AdmissionsView>` block) and `?section=care` → Admissions tab (already wired to `patient.id`).

## 2. Emergency Contacts accordion label

In `src/features/patients/components/EmergencyContactsInline.tsx` the trigger uses ad-hoc markup (`p-3`, `<span>`, no shared icon slot) so it renders slightly differently from every other Personal Information accordion which uses the shared `SectionHeader`.

Rewrite the `CollapsibleTrigger` to mirror `SectionHeader`:
- `flex w-full items-center justify-between px-4 py-3 group …`
- `<h3 className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-2 text-left"><ShieldAlert className="h-4 w-4 text-primary" /> Emergency Contacts</h3>`
- Same chevron treatment.

## 3. Where Sharon rates a nurse (with new 4-hour + comment rule)

**Current state:** `RateNurseControl` (used inside `AdmissionsView` on each vitals/medication/lab/imaging row) already lets the patient submit a 1–5 star rating per record. The `nurse_record_ratings` table has a `comment` column but the UI never surfaces it, and there is no rate-limit — patients can rate any number of records instantly.

**Changes:**

a) UX — `src/components/admissions/RateNurseControl.tsx`
   - After stars, show an inline "Add a note" trigger that expands a small `<Textarea>` + Submit. Rating without a comment still allowed; comment without a rating is not.
   - On submit, upsert `{ rating, comment }` into `nurse_record_ratings` (existing column).
   - Show the last-submitted rating + comment inline in a muted read-only pill once saved.
   - Disable the control (stars + textarea) with a helper "You can rate a nurse again in Xh Ym" whenever the most recent rating by this patient for this `nurse_id` is under 4 hours old. Countdown recomputed on mount.

b) Enforcement — new migration on `nurse_record_ratings`
   - Add a `BEFORE INSERT OR UPDATE` trigger `enforce_nurse_rating_cooldown()` (SECURITY DEFINER, `search_path=public`) that raises if another row exists with the same `patient_user_id` + `nurse_id` and `created_at > now() - interval '4 hours'` (ignoring the row being updated).
   - Trigger enforces the rule regardless of client, so bypassing the UI still fails.

c) Discoverability — surface nurse ratings at the top of the admission
   - In `AdmissionsView.tsx` add a small "Rate your nurses" summary above the accordions listing every nurse who touched the admission with their most recent rating chip and a jump link, so Sharon knows the feature exists without expanding each accordion.

## Files touched
- new migration (trigger only — no schema changes)
- one insert/update call (row re-parenting)
- `src/pages/patient/MyDetails.tsx`
- `src/features/patients/components/EmergencyContactsInline.tsx`
- `src/components/admissions/RateNurseControl.tsx`
- `src/features/sessions/admissions/AdmissionsView.tsx`
