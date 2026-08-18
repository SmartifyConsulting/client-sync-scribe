# Clearer AI document upload, categories, and SOS cleanup

## 1. Make the AI upload zone obvious

The Documents screen currently hides uploading behind a small outline "Upload"
button and a thin dashed strip of grey text, so it is easy to miss and gives no
feedback about what AI will do with the file.

Replace it with a prominent upload card at the top of the Documents screen and
the patient Documents tab:

- Large dashed drop area with an upload icon, a headline ("Drop an X-ray, scan,
  lab result or handwritten note here"), and a clear primary "Choose file"
  button.
- A one-line explainer of what happens next: images (X-ray, CT, MRI, photos)
  are read and described by AI; PDFs are transcribed.
- Live stage feedback while working: Uploading → Analysing with AI →
  Saving → Done, with the file name shown, plus an explicit error line if the
  AI step fails (so a silent failure is visible instead of looking like nothing
  happened).
- After the upload finishes, a success row with a "View AI description" link
  that opens the preview showing the image plus its interpretation.

### Always show the attachment next to its AI description

For any visual record (X-ray, CT, MRI, photo, scan):

- The document list row shows a small thumbnail of the attached image and a
  badge when an AI description exists.
- The preview shows the attachment itself (image, PDF, or media player) at the
  top and the AI description directly beneath it, side by side on wide screens,
  so the picture and its interpretation are always seen together.
- If a visual has no AI description yet, the preview shows an "Analyse with AI"
  button to generate it on demand.


## 2. Prompt for a category on upload (and allow new ones on the fly)

Add an upload dialog that appears once files are chosen, before saving:

- File list being uploaded.
- **Category** selector (required, defaults to a guess from the file type):
  X-Ray, CT Scan, MRI, Ultrasound, ECG, Lab Result, Pathology Report,
  Historical Record, Referral Letter, Discharge Summary, Photo, Other.
- The selector is searchable and accepts a typed value: typing a name that is
  not in the list offers "Create <name>", which is added on the fly and used
  immediately.
- The list also includes any categories already used on existing documents, so
  a category created once keeps appearing for later uploads.
- Optional record date (moves out of the toolbar into this dialog).
- The chosen category is stored on the document and drives the "Group by Type"
  grouping, so uploads no longer all land under "Upload".

## 3. Close all open SOS calls

Close every emergency incident that is not already completed or cancelled
(currently 17: 7 open, 4 assigned, 2 en route, 1 arrived, 1 collected,
2 at hospital), marking them cancelled/closed with a timestamped
"closed by admin" event so dispatch queues start clean.

## Technical notes

- `DocumentsBrowser.tsx`: extract the toolbar upload into a new
  `UploadDocumentsDialog` component holding category + record date; keep the
  existing image → `analyze-medical-image`, PDF → `transcribe-record` routing
  and pass the chosen category into `documents.template_name`.
- Category options = fixed defaults merged with `distinct template_name` from
  the loaded documents; free-text entries need no schema change.
- Surface the AI step result in `UploadProgressBar` (new "analysing" stage and
  an error message when the function call fails).
- SOS closure via a SQL update on `holarchelp_incidents` plus matching
  `holarchelp_incident_events` rows.
