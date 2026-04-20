

# Plan: Holarc Sales Deck — Mock-up Screenshots (Clinical + Practice Management)

A one-off artifact task. Capture key Holarc screens across **Doctor (clinical)**, **Doctor (practice management)**, and **Patient** perspectives, wrap each in a macOS-style window frame on a tasteful gradient, and deliver a polished sales-deck-ready set.

## The story

**Patient:** Sarah Mitchell, 42, Type 2 Diabetes + mild hypertension. Recently admitted overnight at Mediclinic Cape Town for chest pain (cardiac ruled out).
**Doctor:** Dr. Lisa Anderson (`developer@smartify.co.za`) — GP running a small private practice. Coordinates with Dr. James Anderson (`director@smartify.co.za`) via Round Table.

This story showcases the **full clinical loop AND the business-of-medicine loop**: scheduling, billing, templates, partners, and admin operations.

## Screens to capture (14 total)

### Doctor — Clinical (5, desktop 1440×900)
1. **Doctor Dashboard** — Today's Briefing, stats, upcoming appointments, recent activity
2. **Patient List** — alphabetised roster with Sarah visible
3. **Sarah's Patient Profile** — overview tab: vitals, Vula badge, conditions
4. **Hospital Admissions tab** — Mediclinic admission with vitals, meds, labs, imaging
5. **Session Detail** — completed session with AI summary + action points

### Doctor — Practice Management (5, desktop 1440×900) ← **NEW FOCUS**
6. **Admin Hub → Calendar** — week view, colour-coded appointments, Google Calendar sync visible
7. **Admin Hub → To-Do** — practice tasks list with dictation mic + AI-suggested items
8. **Admin Hub → Invoices** — invoice list with paid/outstanding totals, currency config
9. **Admin Hub → Templates** — letterhead + 6 default document templates with logo
10. **My Practice / Settings** — practice details, signature font picker, billing config, partners

### Patient (4, mobile 390×844, Sarah's account)
11. **My Profile** — personal/clinical landing
12. **My Holarchive (Holarchy)** — care team avatars (Lisa, James, etc.)
13. **My Rewards** — Vula count, adherence streak
14. **My Sessions / Hospital Visits** — Mediclinic stay timeline

## Approach

**Step 1 — Seed realistic data via `psql`** (scoped to test accounts, tagged for cleanup):
- `Sarah Mitchell` patient record + linked patient user
- 1 Mediclinic admission + 3 vitals + 2 active meds + 2 labs + 1 imaging
- 6 upcoming appointments (mix of patients, colour-coded types) for the calendar shot
- 8 to-do items (doctor + AI-suggested) for the To-Do shot
- 5 invoices (3 paid, 2 outstanding) across 2 months for the Invoices shot
- Practice settings: logo, signature font, currency = ZAR, billable services
- 2 practice partners (receptionist + nurse) for the Settings shot
- 3 recent sessions w/ AI summaries
- Round Table thread: Lisa ↔ James about Sarah
- 47 Vulas + adherence history for Sarah

**Step 2 — Capture screenshots** via browser tools:
- Login as `developer@smartify.co.za` for shots 1–10 (desktop 1440×900)
- Login as Sarah for shots 11–14 (mobile 390×844)

**Step 3 — Frame each shot** using the `product-shot` skill:
- **Clinical (1–5)** → `ocean` / `midnight` (clinical trust, deep teal/navy)
- **Practice mgmt (6–10)** → `aurora` / `arctic` (operational, fresh, business-credible)
- **Patient (11–14)** → `peach` / `lavender` / `candy` (warm, human)

**Step 4 — QA each PNG** by re-reading it; check for cropped UI, login overlays, blank states, contrast issues. Re-shoot failures.

## Deliverables → `/mnt/documents/`

| Artifact | File |
|---|---|
| 14 framed product shots | `holarc-01-doctor-dashboard.png` … `holarc-14-patient-hospital-visits.png` |
| Contact sheet (3 columns, grouped by perspective) | `holarc-contact-sheet.png` |
| Narrative README mapping each shot → pitch beat, with a dedicated **"Practice Management"** section highlighting #6–#10 | `holarc-screenshots-README.md` |
| Seed SQL for reproducibility / cleanup | `holarc-seed.sql` |

## Constraints

- Sarah Mitchell is fabricated — no real patient data
- No app code changes — screenshots + DB seed only
- All seeded rows tagged `mock_seed: holarc-deck-v1` where the schema allows
- Inserts scoped to the two test accounts only

