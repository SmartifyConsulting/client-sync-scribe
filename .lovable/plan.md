# My Views cleanup, email fixes, and a proper Nurse profile

## 1. My Views

- Grouping dropdown loses the "then by User" wording — options become simply **Date** and **Screen** (the second-level grouping by user stays in the layout, it just isn't spelled out in the picker).
- Seed demo view records so the screen is never empty in demos: a spread of views over today / yesterday / earlier in the week, from a doctor, a nurse and a hospital admin, across screens like Patient Overview, Sessions, Documents, Admissions and Ward Board.

## 2. Where My Views lives

- **Patients only.** Remove it from the doctor "My Patients" section and never show it to nurses.
- List it in the patient menu directly under **My Tasks**.

## 3. Prescription email fixes (from the screenshot)

- **Raw `<br>` text in the body**: the plain-text email path escapes everything, so document content that already contains HTML line breaks prints the tags literally. Fix the formatter to first convert existing `<br>` / `<br/>` / `<p>` markup into real line breaks and strip any other stray tags before escaping, so the prescription renders as clean formatted text.
- **Wrong signature font**: the sending profile has `signature_font` set to `sans`, which isn't a script font, so the email falls back to a generic cursive (Comic Sans in Gmail) instead of the Great Vibes signature Dr Dean configured. Two things:
  - Correct the stored signature settings for the affected doctor account so the font matches what was chosen in My Practice.
  - Make the signature reliable regardless of the mail client: when a doctor has a typed signature but no rendered PNG on file, the app generates and stores one automatically (same canvas render already used when saving in My Practice), and email keeps embedding that PNG inline. Unknown font values fall back to the doctor's selected script rather than a generic cursive.

## 4. Nurse profile

### Role badges
Nurses get the same dual badge treatment doctors have: a **Nurse | Patient** toggle beside the dashboard in the sidebar and matching role labels in the account menu, so a nurse can switch to her own patient view and back.

### Nurse navigation ("My Patients" section)
1. Dashboard (nurse dashboard — her ward at a glance)
2. My Shifts
3. Ward Board
4. Admissions

Removed for nurses: My Holarprac section, Sessions, Documents, Round Tables, My Views.

### Ward assignment and access scope
- Capture the ward a nurse is assigned to on her hospital nurse record (new ward field, chosen from that hospital's wards when adding or editing a nurse).
- Ward Board, Admissions and the nurse dashboard show only her hospital **and** only her assigned ward.
- Access is enforced in the database as well as the UI, so a nurse cannot read patients outside her ward.

## Technical notes

- `src/pages/MyViews.tsx`: relabel the Select options only; grouping logic unchanged.
- `src/components/layout/Sidebar.tsx`: drop `/my-views` from `DOCTOR_SECTIONS`, add it to `patientNavItems` after My Tasks, and rebuild `nurseNavItems` as a "My Patients" section with dashboard / my-shift / ward-board / admissions; add the nurse-mode profile toggle mirroring the doctor toggle. `AccountMenu.tsx` gains the nurse label.
- Migration: `hospital_nurses.ward_id uuid references public.hospital_wards(id)`; helper `nurse_ward_id(uuid)` (security definer) used by RLS on ward/admission reads; nurse policies scoped to `hospital_id` + `ward_id`.
- Nurse dashboard: new screen under the hospital provider routes reusing existing ward-board and admissions data hooks, filtered by the nurse's ward.
- `supabase/functions/send-document-email/index.ts`: replace the escape-everything block with a small HTML-aware normaliser (convert breaks/paragraphs, strip remaining tags, then escape).
- Signature: extend `MyPractice.tsx` (or a small hook) to backfill `signature_render_url` when missing; `_shared/signature.ts` fallback font keyed off the doctor's stored choice.
- Demo data inserted into `profile_view_log` with `screen` and `owner_id` populated.
