## 1. To-Do List — restore patient sub-grouping

In `src/pages/TodoList.tsx`, when grouping by **Date**, each bucket (Today / This week / This month / Older) currently renders a flat list. Restore the second level:

- Inside each date bucket, group tasks by patient name (fallback "Unassigned").
- Nested patient accordions, **all collapsed by default**, separated by a fine grey line.
- Sub-header: patient name + count pill, lighter/smaller than the green top-level header.
- Grouping by **Patient** stays single-level.

## 2. Documents → Templates tab

- Fix invisible hover text on the `All Documents` / `Templates` tab triggers (explicit hover text colour) in `src/pages/doctor/DoctorDocumentsPage.tsx`.
- Rename the card action button **Use → View** in `src/pages/doctor/DoctorTemplatesTab.tsx`.

## 3. About Me — AI synopsis

- Add a **Generate with AI** button beside Save in the About Me accordion (`src/pages/MyPractice.tsx`).
- New edge function `generate-about-me` reads the doctor's own profile data (name, qualifications, specialty, years of experience, practice, services) and returns a warm patient-facing synopsis under 600 words.
- Result fills the textarea as an editable draft; nothing saves until Save is pressed. Handle 429/402 with clear toasts.

## 4. Unified field frames across profile sections

Apply the patient **Personal Information** frame treatment to every section inside:
- Patient Personal Information and Medical Information (`PatientDetailsEditor.tsx`)
- All My Practice sections (`MyPractice.tsx`)

Rules: one bordered frame per section with `divide-y` rows, no rounded sub-frames or gaps, same horizontal label/value layout and padding. **Field labels go up one size step** (`text-[10px]`→`text-xs`, `text-xs`→`text-sm`) and stay bold; values keep their current size.

## 5. Doctors get their own patient profile in-place

Doctors who are also patients should never need to switch accounts:

- Add **My Profile** to the doctor sidebar nav (`src/components/layout/Sidebar.tsx`), pointing at the doctor's own patient record — the same "My Profile" screen patients see, rendered inside the doctor shell.
- Resolve the doctor's own patient record from their `user_id`; if none exists, create/link it on first visit so the screen is never empty.
- The doctor's teal/blue theming and sidebar stay intact — only the content area shows the patient profile.
- In **Documents**, add a **My Documents** filter (alongside the existing Date / Patient / Type grouping) that narrows the list to documents belonging to the doctor's own patient record.

### Technical notes
- New file: `supabase/functions/generate-about-me/index.ts` using Lovable AI with in-code JWT validation.
- No schema changes; About Me still saves to `profiles.about_me`.
- Label sizing centralised in a shared class constant so all screens stay in sync.
- Own-record lookup uses the existing hardened pattern: `.order("created_at").limit(1).maybeSingle()`.
