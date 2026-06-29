
## 1. Make action icons always visible (no hover required)

Remove `opacity-0 group-hover:opacity-100` from row action buttons so View / Share / Edit / Delete are visible by default — the screenshot shows the Documents / Patient Overview row toolbar.

- `src/pages/Documents.tsx` — lines 411 & 521: drop the opacity classes from the action `Button`s.
- `src/features/patients/components/PatientOverview.tsx` — lines 710, 757, 796: same.
- `src/features/patients/components/SessionCard.tsx` — line 55: keep the external-link affordance visible by default.
- Avatar overlays (`PatientDetailsEditor.tsx:1264`, `MyPractice.tsx:1142`) keep their hover behavior — they are camera overlays, not action menus.

## 2. Chronic medication → "Contact emergency contact if skipped"

In the medication editor, when a row is flagged **Chronic**, reveal a new checkbox:

> *"Contact emergency contact if this medication is skipped"*

- Store on the prescription row as `notify_emergency_on_skip boolean default false` (new migration on `prescriptions`).
- Render the checkbox inline in the prescription editor only when `is_chronic === true`. Uncheck + hide when chronic is turned off.
- Wire `medication_adherence` skip detection: when a missed dose is recorded for a prescription with this flag, enqueue a notification to the patient's primary emergency contact (no PHI in body — only "Please check in on <patient>").

## 3. Next-of-Kin / Emergency Contact "Sibling" dropdown lockout

`PatientDetailsEditor.tsx` uses a shadcn `Select` for `RELATIONSHIP_OPTIONS`. After the first close without a selection the trigger becomes unresponsive because the parent re-renders with a stale `value`. Fix:

- Make the relationship `Select` controlled with `value={relationship ?? ""}` and an explicit `onValueChange` that always updates state.
- Drop any conditional `disabled` on the trigger; ensure `<SelectTrigger>` is never wrapped in a disabled fieldset for new rows.
- Add a "— Select —" placeholder item so reopening always works.

## 4. Email validation on Emergency Contact & NOK

- Add a shared `isValidEmail` util (RFC-lite regex) in `src/lib/validation.ts`.
- In `EmergencyContactsSection.tsx` / `EmergencyContactsInline.tsx` and the NOK form, block save and show inline error when the email field is non-empty and invalid.

## 5. Patient document upload + AI image explanation

- Surface an **Upload Document** button on the Patient Documents tab (`src/pages/Documents.tsx`) for `role === 'patient'` (currently doctor-only).
- Accept PDF/JPG/PNG up to 5 MB; store in `documents` bucket; insert `documents` row with `created_by = user.id`.
- After upload, if file is an image, call existing AI vision edge function (Gemini 2.5 Pro multimodal) with the signed URL and prompt: *"Explain in plain English what this medical image appears to show. Always end with: 'This is an AI suggestion, not a diagnosis — please consult your doctor.'"*
- Persist the explanation to `documents.ai_summary` (new column, nullable text) and render it under the document with a Sparkles icon and the disclaimer.

## 6. Currency: remove Namibian Dollar, keep Nigerian Naira

Already-present `NGN ₦` stays. Remove every `NAD` / `Namibian Dollar` entry from:

- `src/lib/countryDialCodes.ts` line 17 (Namibia dial code stays — that's a phone code, not currency; keep).
- Actually drop currency entries only: `src/pages/MyPractice.tsx:118`, `src/features/sessions/components/InvoiceEditor.tsx:62`, `src/pages/doctor/Invoices.tsx:117`, and the `NAD: 'N$'` symbol maps in `useSessions.ts:803`, `invoiceHtml.ts:35`, `fillDocumentPlaceholders.ts:73`.

## 7. Profile photo upload — obvious + available to all user types (except hospitals)

- Promote the avatar widget in every profile editor to an **always-visible Camera/Upload affordance** with a "Change photo" label beneath, not just a hover overlay.
- Add the same component to: Patient profile, Doctor profile (already there), Ambulance/Paramedic profile, Pharmacy profile, Insurance profile.
- Suppress on Hospital editor (`HospitalProfile`) — show building logo placeholder only.

## 8. Practice partner frame + shared-calendar checkbox per partner

In `MyPractice.tsx` Partners accordion:

- Wrap each partner row in a bordered card frame (`border border-primary/30 rounded-lg p-3`) with the partner name as header and contact details inside.
- Add **two controls per partner card**:
  - Checkbox: *"Include in shared practice calendar"* (persist as `practice_partners.shared_calendar boolean default true`).
  - Color swatch picker (8 presets) → `practice_partners.calendar_color text`.
- Remove the standalone **Shared Practice Calendar** accordion section entirely; calendar coloring now reads from each partner row.
- Calendar views (`CalendarView.tsx`) pull color from `practice_partners.calendar_color` and filter by partners whose `shared_calendar = true`.

Migration adds the two columns with sane defaults; locale files keep `sharedCalendar` key but it now labels the per-partner checkbox.

## 9. Friendly camera-error messages

Replace the generic toast in `HealthPhotoCapture.tsx`, `MediaCapture.tsx`, `PillBaselineCapture.tsx`, `ActivityProofCapture.tsx` with mapped errors:

| DOMException name | Message |
| --- | --- |
| `NotAllowedError` / `PermissionDeniedError` | "Camera permission was blocked. Please allow camera access in your browser settings and try again." |
| `NotReadableError` / `TrackStartError` | **"Your camera looks like it's being used by another app (Zoom, Teams, FaceTime, another browser tab). Close it and try again."** |
| `NotFoundError` / `DevicesNotFoundError` | "No camera was detected on this device." |
| `OverconstrainedError` | "Your camera doesn't support the requested settings. Try a different device." |
| default | "Couldn't start the camera. Please refresh and try again." |

Extract to a shared `mapCameraError(err)` helper in `src/lib/cameraErrors.ts`.

## 10. Doctors can't see patient's emergency contact

Patient Overview (doctor-facing) is missing the Emergency Contact panel. Add an **Emergency Contact** card to `PatientOverview.tsx` (read-only) showing name, relationship, phone (click-to-call), email — pulled from `patients.emergency_contact_*` columns. Respect RLS: only doctors with an accepted `doctor_patient_access` row see it (already enforced by existing policy).

---

### Technical notes

```text
DB migrations
├── prescriptions.notify_emergency_on_skip boolean default false
├── documents.ai_summary text
├── practice_partners.shared_calendar boolean default true
└── practice_partners.calendar_color text default '#0EA5E9'

New files
├── src/lib/validation.ts          (isValidEmail)
├── src/lib/cameraErrors.ts        (mapCameraError)
└── supabase/functions/explain-document-image/index.ts  (Gemini vision)
```

No changes to auth, roles, or RLS beyond reusing existing policies.
