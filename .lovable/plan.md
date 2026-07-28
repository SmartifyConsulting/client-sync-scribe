## My Biolog — port of Personal Bestie's tracking + correlation engine

Bring across only the functionality (programme administration, daily tracking, correlations). None of the Personal Bestie visual design — everything uses Holarc's existing tokens, `SectionAccordion`, teal/blue role colours, Sora/Manrope type, and the standard button/tab formats.

### Navigation
- New nav entry placed **after Test Results and before Tasks** in both menus: **My Biolog** for patients, **Biolog** alongside the doctor's **Test Results** entry. Route `/biolog`.
- Sub-tabs inside the page: **Today** (check-in) · **History** · **Insights** · **Programmes** · **Customise**.

### 1. Customisable trackables (per user)
Every user configures their own biolog:
- **Wellbeing sections** — good/neutral/bad + 1–10 intensity, grouped Physical / Mental. Seeded with standard ones (sleep, energy, pain, allergies, state of mind, focus, motivation) but each can be renamed, disabled, reordered, or replaced with custom ones.
- **Foods** — personal food list by category, used for meal logging (breakfast/lunch/dinner/snack).
- **Exercises** — categories + items, with intensity, quantity/duration and performance rating.
- **Medications / supplements** — label, dose amount and unit; ticked off with quantity at check-in.
- **Section order** — user-defined order of the check-in blocks.

### 2. Daily check-in (tracking)
One screen per day: wellbeing rows, meals, exercise, medication. Supports editing a past entry from History. Includes **voice check-in**: record, transcribe, and let AI pre-fill the sliders, foods, exercises and medications — you review before saving. History groups entries by Today / This Month / Year, matching the grouping pattern already used in Sessions.

### 3. Correlations (insights)
- Averages chart per variable with day / week / month periods and period-vs-period comparison.
- Correlation cards grouped by category (Diet & Physical, Mental & Cognitive, Exercise & Result, plus user-created groups), each computing "X is N% higher/lower with Y" over a chosen date range (all time / this week / last week / this month / custom).
- Users toggle which correlations show, add custom ones (pick outcome variables + input variable + group), and get AI-suggested correlations based on what they actually track.

### 4. Programmes
- A programme is a named plan (diet, exercise, or mixed) with a description, duration, target trackables, and optional daily targets.
- **Doctors** create programmes and assign them to a patient from the patient record; **patients** can create their own.
- Active programmes surface on the check-in screen as the day's focus, and the Insights view can be filtered to a programme's window so before/during comparison is possible.
- Programme list shows status (active / completed / cancelled), assigning practitioner, and adherence (days checked in vs days elapsed).

### 5. Doctor visibility
Read-only **Biolog** tab in the patient record showing that patient's entries, adherence and correlations — gated by the existing patient consent / profile-share scopes (a new `biolog` scope is added to the granular "can view" sub-selections already in place).

### Technical notes
- New tables (all RLS'd to the owning user, with grants): `biolog_sections`, `biolog_section_order`, `biolog_foods`, `biolog_exercises`, `biolog_medications`, `biolog_correlations`, `biolog_entries` (JSONB payload per day), `biolog_programmes`, `biolog_programme_assignments`. Doctor read access via the existing `doctor_patient_access` / `patient_profile_shares` helpers; `biolog` added to the share-scope list.
- Ported logic lives in `src/features/biolog/` — `lib/correlations.ts` (built-in definitions + `computeInsight`), hooks for entries/sections/programmes, and components for check-in, history, insights, programmes and customise.
- No localStorage fallback: entries are written straight to the database (Personal Bestie's local-first storage layer is dropped).
- Two edge functions: `biolog-voice-checkin` (transcribe + parse into the user's own trackables) and `biolog-suggest-correlations`, both on Lovable AI.
- i18n keys added to `en.json` for nav and all new labels.

### Out of scope
Personal Bestie's fans/followers, tasks, invitations, public profiles, billing and its visual theme are not imported.
