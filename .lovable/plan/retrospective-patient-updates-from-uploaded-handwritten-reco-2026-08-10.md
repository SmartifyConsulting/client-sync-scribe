# Retrospective patient updates from uploaded handwritten records

Today an uploaded handwritten PDF is transcribed and the AI extracts a history block, but the
apply step writes plain text into fields that are actually structured lists, and the patient
Overview never sees the record at all (the Overview summary is generated only from the patient
row plus consultation sessions). Result: nothing meaningful lands on the patient record.

## 1. Write extracted history into the right fields

The apply step currently appends text strings to `conditions_diagnoses`, `current_medications`,
`family_history` and `surgeries` — these are structured lists, not text, so the write is wrong.
Fix the apply logic so each extracted item is added as a proper entry:

- Conditions/diagnoses, medications, surgeries, family history: appended as list entries with
  name, the record date, and a source marker ("From handwritten record, <date>").
- Allergies: appended to the existing allergies text, de-duplicated case-insensitively.
- Nothing is ever overwritten or removed; existing entries stay untouched.
- Items already present (same name) are skipped rather than duplicated.

## 2. Overview gets retrospective bullet points

After a transcription is applied, append a dated block to the patient's notes:

```text
Historic record — 12 Mar 2019 (transcribed handwritten notes)
• <bullet>
• <bullet>
```

The AI produces these bullets in the same transcription pass (concise, clinical, one fact per
bullet, no invention). The Overview timeline reads notes, so these appear as retrospective
entries dated by the record date rather than the upload date.

## 3. Overview summary includes transcribed records

Pass transcribed historical documents (text + record date) into the Overview summary generation
alongside sessions, so the AI narrative and the conditions/medications/allergies panels reflect
the old paper history and place it correctly on the timeline by record date.

## 4. Flow after upload

Upload → transcribe → extraction runs automatically → the review dialog opens with everything
pre-selected, showing the bullets and the structured items about to be added. The clinician
confirms (or unticks items) before anything is written — no silent changes to a patient record.
After applying, the Overview refreshes so the new entries are visible immediately.

## 5. Progress bar with stage labels

The existing upload progress bar is extended to narrate every stage of the pipeline, so the
clinician always knows what is happening (and that a long transcription hasn't stalled):

```text
Uploading document…            (real % of the file transfer)
Transcribing handwritten notes…(animated shimmer while the AI reads the pages)
Extracting medical history…    (conditions, medications, allergies)
Recording data in the app…     (saving the document + updating the patient record)
Done                           (brief tick, then the review dialog)
```

Multi-file drops show "File 2 of 5" alongside the stage. Failures stop the bar on the stage that
failed with a plain-English reason rather than a generic error.

## Technical notes


- `supabase/functions/transcribe-record/index.ts`: extraction pass also returns
  `overview_bullets` and a normalised `record_date`.
- `src/features/documents/components/ApplyHistoryDialog.tsx`: rewrite the apply logic to handle
  jsonb list columns (`conditions_diagnoses`, `current_medications`, `surgeries`,
  `family_history`) versus text columns (`allergies`, `notes`); add the bullets preview section.
- `src/features/documents/components/DocumentsBrowser.tsx` and
  `src/features/documents/UploadDocumentDialog.tsx`: open the review dialog automatically after
  transcription and invalidate patient queries on apply.
- `supabase/functions/summarize-patient-history/index.ts`: accept an optional
  `historicalRecords` array; the client fetches transcribed documents for the patient and passes
  them in.
