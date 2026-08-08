# Documents, Templates, Inform Sharing & Task Assignment

## 1. Assign Task from the action menu

- Move "Assign Task" into the existing per-task actions dropdown (⋮) on each task row, in two places:
  - Dashboard task list (`src/components/dashboard/CompactTodoList.tsx`)
  - Tasks screen (`src/pages/TodoList.tsx`)
- Selecting it opens the existing Assign Task dialog pre-filled with that task, so it can be reassigned to a doctor, assistant or patient.

## 2. Patient profile → Documents tab uses the Documents view

- Replace the bespoke list in the patient profile Documents tab with the same grouped documents list used on the Documents screen, scoped to that patient.
- Default grouping changes app-wide to **by Type**, and within each type sorted newest first (date descending). Date and Patient grouping stay available as options.
- Clicking a document opens it **inline** in a preview/editor dialog on the same page — no navigation to `/documents?view=...`. The same inline behaviour applies on the main Documents screen.

## 3. Upload any document (drag & drop)

- Add a drop zone / "Upload" button to the Documents tab and Documents screen accepting PDFs, images, Word files and scans, alongside the existing "Add Document" template flow.
- Uploaded files are stored in patient media storage and appear as document records with a type badge and a link to the original file.

## 4. Handwritten record transcription

- When an uploaded file is a scan/photo of a handwritten record, offer "Transcribe with AI".
- AI reads the scan and produces:
  - a new editable document containing the transcribed text (doctor can correct it),
  - a link back to the original scan, kept in storage,
  - a **record date** field so the entry is filed retrospectively — the transcribed note appears in the patient's history at its original date, rebuilding past history inside the app.

## 5. Inform button (share document links, never files)

- New "Inform" action on any document.
- Choose one or more doctors already on the app, or type any email address.
- Sends an email containing **a link only** — the document itself is never attached.
- The link is login-gated: existing users sign in and land on the document; new recipients are taken to registration and, after signing up, land on the same document (subject to the patient's sharing rules).
- Multiple documents can be selected so one Inform email carries several links.

## 6. New templates: Exercise Programme and Eating Plan

Add two default templates with full structure:

- **Exercise Programme** — patient/practitioner header, goal, precautions/contraindications, weekly schedule table (exercise, sets/reps or duration, intensity, frequency), progression plan, review date, signature.
- **Eating Plan** — patient/practitioner header, goals and target weight, daily meal structure (breakfast/lunch/dinner/snacks), foods to include, foods to limit, hydration, supplements, review date, signature.

Both use the standard placeholders (`[PatientName]`, `[DoctorSignature]`, etc.) so they auto-fill like existing templates.

## 7. Assistant access to Exercise & Eating programmes

- Practice Management Assistants can view (read-only) documents of type Exercise Programme and Eating Plan for practice patients, so they can check in on progress. All other clinical documents stay hidden from them.

## 8. Keep history when a patient disconnects a doctor

- Disconnecting a doctor removes ongoing access, but **no data is deleted**: sessions, documents, prescriptions and notes remain on both the patient's record and the previous doctor's record.
- Newly connected doctors continue to see the full patient history.

## Technical notes

- Extract the grouped documents list from `DoctorDocumentsTab` into a shared component used by the Documents screen and the patient Documents tab; default `groupMode` becomes `type` with date-descending ordering inside groups.
- Document open switches from `navigate('/documents?view=...')` to opening `DocumentEditor` in a dialog.
- New columns on `documents`: `source_file_url`, `record_date`, `is_transcribed`, plus an `Exercise Programme` / `Eating Plan` template category; RLS policy addition giving `is_practice_assistant` read access limited to those two template names.
- New `document_shares` table (document id, recipient email, recipient user id, token, created_by, expires_at) plus an `inform-document` edge function that resolves recipients and sends link-only emails via the existing document email function.
- New `transcribe-handwritten-record` edge function using an AI vision model to convert scans to text; returns text plus a suggested record date for doctor confirmation.
- Disconnect flow audited to ensure it only revokes access rows (`doctor_patient_access`) and never deletes sessions/documents.
