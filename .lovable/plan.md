

# Plan: Holarc Sales Deck — Mock-up Screenshots (proceeding with sensible defaults)

Picking up from the clarifying questions with practical defaults so we can ship the deck.

## Decisions

1. **Test account** → use the **currently logged-in doctor account** in the preview (the user is already on `/patients/...` so a doctor session is active). I'll seed Sarah Mitchell under that doctor's `user_id` rather than the non-existent `developer@smartify.co.za`.
2. **Patient shots** → I'll capture shots **6–10 (practice management) and the 5 doctor clinical shots** from the current doctor session first. For the **4 patient mobile shots**, I'll seed Sarah's patient record with a `patient_user_id` pointing to one of the existing patient accounts in the DB (or skip those 4 if no patient session is available, and deliver 10 doctor shots — confirming in the README which were captured).
3. **DB writes** → seed a **focused, tagged dataset** (every row gets `mock_seed = 'holarc-deck-v1'` in a notes/metadata column where the schema allows, so cleanup is one query later).

## Execution

### Step 1 — Inspect schema & current doctor
- Query `profiles`, `patients`, `appointments`, `invoices`, `hospital_admissions`, `todo_items`, `sessions`, `practice_partners`, etc. to confirm column names before seeding.
- Identify the active doctor's `user_id` (most-recent doctor profile in `user_roles`) and any existing patient user accounts.

### Step 2 — Seed via `psql`
Insert tagged mock data scoped to the active doctor:
- Patient `Sarah Mitchell` (DOB 1982, T2DM + HTN, Cape Town address)
- 1 hospital admission (Mediclinic, 2 nights, chest pain workup) + 3 vitals + 2 active meds (Metformin 500mg BD, Amlodipine 5mg OD) + 2 labs (HbA1c 7.8%, eGFR 88) + 1 imaging (CXR clear)
- 6 upcoming appointments across the week (mixed patients & types) for Calendar
- 8 to-do items (mix of doctor-created and AI-suggested) for To-Do
- 5 invoices (3 paid, 2 outstanding) over 2 months for Invoices
- Practice settings if missing: signature font, currency ZAR, billable services list
- 2 practice partners (receptionist Jane, nurse Thandi)
- 3 recent sessions for Sarah with AI summaries
- Round Table thread on Sarah
- 47 Vulas + 14-day adherence streak

### Step 3 — Capture screenshots
**Doctor desktop (1440×900)** — using the active doctor session:
1. `/dashboard` — Today's Briefing
2. `/patients` — alphabetised list with Sarah
3. `/patients/{sarah-id}` — overview tab
4. `/patients/{sarah-id}` — Admissions tab
5. `/sessions/{recent-session-id}` — session detail
6. `/admin` (Calendar tab default)
7. `/admin` → To-Do tab
8. `/admin` → Invoices tab
9. `/admin` → Templates tab
10. `/my-practice` or `/settings` — practice settings

**Patient mobile (390×844)** — only if a patient session is available; otherwise skip and note in README:
11. `/patient/details?section=health` — My Profile
12. `/patient/details?section=care` — My Holarchive
13. `/patient/rewards` — Vulas
14. `/patient/tasks` — My Tasks

### Step 4 — Frame via the `product-shot` skill
Copy `knowledge://skill/product-shot/scripts/generate.py` → `/tmp/`, then wrap each PNG:
- Clinical (1–5) → `ocean` / `midnight`
- Practice mgmt (6–10) → `aurora` / `arctic`
- Patient (11–14) → `peach` / `lavender`

### Step 5 — QA
After each framed PNG renders, view it and check for: cropped UI, login overlay artefacts, blank states, contrast issues, frame defects. Re-shoot any failures.

### Step 6 — Deliverables → `/mnt/documents/`

| Artifact | File |
|---|---|
| Up to 14 framed PNGs | `holarc-01-doctor-dashboard.png` … `holarc-14-*.png` |
| Contact sheet (3-col grid grouped by perspective) | `holarc-contact-sheet.png` |
| Narrative README — pitch beats, dedicated Practice Management section | `holarc-screenshots-README.md` |
| Seed SQL for reproducibility / cleanup | `holarc-seed.sql` |

## Constraints

- Sarah Mitchell is fabricated — no real patient data
- No app code changes
- All seeded rows tagged `mock_seed = 'holarc-deck-v1'` where the schema allows; README documents the cleanup query
- If browser automation can't authenticate as a patient, the deck ships with the 10 doctor-side shots and the 4 patient shots are listed as "pending — needs patient session"

