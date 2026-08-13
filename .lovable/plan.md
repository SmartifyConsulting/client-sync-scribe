# Biolog nav, Overview subtabs and the private Emotional Journal

## 1. Biolog back on the nav menu

Restore "My Biolog" to the sidebar for patients (after My Profile) and for doctors (under Sessions). The `/biolog` route already exists — only the nav entries were removed.

## 2. Overview gets two subtabs

The patient Overview becomes two subtabs, shown in the doctor's patient profile and in the patient's own profile:

- **Physical State** — everything the Overview shows today: AI Overview Summary, history timeline, allergies, conditions, medications, symptoms, chronic meds, DISC.
- **Emotional State** — the journal (see below) plus a short explainer on how emotions can show up in the body.

## 3. Emotional journal (patient-only)

- Only the patient can write and read their journal entries. A permanent notice sits above the entry box: *"This journal is private. Only you can read what you write here. Your care team never sees these entries — only a short, generalised note may appear in your health summary."*
- Simple flow: date, a short free-text entry, save, and a list of past entries the patient can edit or delete.
- The patient picks the handwriting-style font for their journal from the same font set doctors use for their signature, so entries read in their own hand.
- Below the entry box, a short standing explainer on the somatological effect of emotions — that sustained stress, grief, anger or fear commonly express themselves physically (tension, pain, sleep and digestive changes) — written as general information, not a diagnosis.
- Past entries collapse into date accordions grouped **Today / This week / This month / Earlier**. Each accordion row shows the AI's short summation, which both the patient and the doctor can read.
- Only the patient can expand an accordion to reveal the entry itself. For a doctor the rows are not expandable at all — they see the summation and nothing more.

## 4. What the AI does with the journal

A new AI pass reads the journal and reports on possible metaphysical causes behind the patient's health results, based only on what the journalling contains. It produces short, conservative outputs stored separately from the raw entries:

- A **generalised theme** — specifics are stripped and abstracted. "Father and daughter had a fight" becomes "internal family conflict". No names, no incidents, no quotes.
- A **conservative metaphysical note** — a reasonable, tentative symbolic/emotional association for the pains or results the patient is reporting ("may be associated with…"), never a cause, never a diagnosis.
- **Silence is the default.** If nothing substantial emerges from the journal, the AI returns nothing and no emotional content appears anywhere — no filler, no speculative note.

Both appear in the **AI Overview Summary** only, rendered in **bold orange**, and the doctor sees both. The raw journal text is never sent to the doctor's view and never stored in the summary.


## 5. Timeline stops regenerating

Today the whole summary — timeline included — is regenerated on every visit to the Overview. Instead:

- The generated history timeline is stored once per patient and reused on every subsequent visit.
- It regenerates only when new material arrives (a new session or a newly transcribed record) or when the user clicks Refresh.
- The **AI Overview Summary** is the only part that regenerates on each visit, so the emotional context stays current.

## Technical notes

- **Migration**
  - `patient_emotional_journal` — patient-owned entries (`entry_date`, `body`, `font_key`). RLS: the owning patient only, for select/insert/update/delete. No doctor policy at all; grants to `authenticated` and `service_role` only.
  - `patient_emotional_insights` — derived, sanitised output per entry and per period (`entry_id`, `summation`, `theme`, `metaphysical_note`, `generated_at`, `source_entry_count`). Readable by the patient and by clinicians who already hold access to the patient record; written only by the edge function via service role. The per-entry `summation` is what the doctor sees on a collapsed accordion row.
  - `patient_history_timelines` — cached timeline (`patient_id`, `timeline` jsonb/text, `source_fingerprint`, `generated_at`) using the same access rules as the patient record.
- **Edge function `analyze-emotional-journal`** — validates the caller's JWT, reads that user's own journal rows with the service role, calls Lovable AI (`google/gemini-2.5-flash`, JSON output) with a strict system prompt: abstract to a theme, no names/events/quotes, tentative wording, no diagnosis, return nothing when the material is thin. Writes only the sanitised row to `patient_emotional_insights`.
- **`summarize-patient-history`** — takes an optional `cachedTimeline`. When the fingerprint matches, it skips timeline generation and regenerates only the narrative summary; otherwise it regenerates the timeline and stores the new fingerprint. The emotional theme and metaphysical note are passed in as pre-sanitised strings, never the journal.
- **`PatientOverview.tsx`** — split into `OverviewPhysicalTab` and `OverviewEmotionalTab` under `src/features/patients/components/overview/`, with the existing teal pill TabsList. Summary rendering marks the emotional segments with a `font-bold text-orange-600` span.
- **`Sidebar.tsx`** — re-add the Biolog nav entries.
