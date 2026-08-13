# Maeve session resume + biological-age lab markers

## 1. Opening a past exploration goes to a recap screen

Today, tapping a past exploration in Ask Maeve drops the user straight back into the chat with the start buttons showing. Instead, opening an existing session shows a **Recap view**:

- **Overarching summary** of the exploration at the top (uses the stored session summary; if none exists yet, generate one from the messages on open).
- **Transcript** in a collapsed accordion below it — expands to the full dated exchange.
- **Speak the summary**: a play control lets Maeve read the recap aloud so the user can re-enter the state without reading.
- **Would you like to continue?** — with two ways to resume:
  - **Continue with voice** — resumes voice mode (mic permission requested only on tap).
  - **Continue with typing** — resumes the text composer.
- Closed sessions show the recap read-only with a "Reopen and continue" action.

Only a brand-new exploration shows the original start buttons.

## 2. Rename sessions at any time

- The session title is editable inline (pencil icon) on both the Ask Maeve list and the session/recap header, and while a session is in progress.
- Saving writes the new title immediately; empty titles fall back to the auto-generated name.

## 3. Biological-age assessment modal: clinical marker inputs

Extend the "Add biological-age assessment" modal so doctors can capture the supporting panel alongside the epigenetic result. New grouped section **Supporting clinical markers** (all optional, values stored exactly as entered):

| Input | What it reflects |
| --- | --- |
| DNA methylation / epigenetic age | Biological ageing (already captured) + ageing pace |
| HbA1c | Long-term blood glucose / metabolic health |
| Lipid panel (total, LDL, HDL, triglycerides) | Cardiovascular / metabolic risk |
| hs-CRP | Systemic inflammation |
| Blood pressure (systolic / diastolic) | Cardiovascular health |
| Kidney function (eGFR, creatinine) | Kidney health |
| Liver function (ALT, AST, GGT) | Liver / metabolic health |
| Full blood count (Hb, WCC, platelets) | General physiological health |
| Weight + waist circumference | Body composition / metabolic risk |
| Fitness (VO₂max or equivalent) | Cardiorespiratory fitness |

Each field shows its unit and its "what this reflects" caption in small text. Saved markers display on the assessment card and feed the ageing trajectory narrative as context.

## Technical notes

- Ask Maeve: split `MaeveChat` entry into `MaeveRecap` (summary, collapsed transcript, TTS playback, continue actions) and the existing live chat; route `/ask-maeve/:id` to the recap unless the session was just created or the user chose to continue. Summary generation reuses the existing `ask-maeve-chat` edge function with a summarise instruction; TTS reuses the existing Maeve voice hook.
- Rename: `ask_maeve_sessions.title` update via the existing session hook; optimistic cache update.
- Markers: add a `markers` JSONB column (plus `assessment_type` staying as-is) to `biolog_biological_age_assessments` via migration, with GRANTs unchanged since the table already exists; the dialog serialises only the fields the doctor filled in. No calculated biological age is derived from these markers — they are stored and displayed as supplied.
