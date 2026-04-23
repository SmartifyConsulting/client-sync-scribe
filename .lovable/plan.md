

# Plan: Smaller template fonts, doctor-side patient docs visibility, AI scan analysis for doctors, delete uploaded docs

Five tied changes. The biggest issue is data: when Shannon (patient) uploads a scan from her own portal, the row is written with `user_id = shannon.user_id`. The doctor's `useDocuments` hook only fetches `WHERE user_id = auth.uid()`, **and** the RLS `SELECT` policy is also `auth.uid() = user_id`. So even if we change the query, RLS will still block it. Both sides need to be fixed.

## 1. Database: let doctors see + delete patient-uploaded documents

Add two new RLS policies on `public.documents`:

- **SELECT** — `Doctors with active access can view patient documents`
  ```sql
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN doctor_patient_access dpa ON dpa.patient_user_id = p.patient_user_id
    WHERE dpa.doctor_id = auth.uid() AND dpa.is_active = true
  )
  OR patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()  -- doctor-owned patient record
  )
  ```
- **DELETE** — same predicate as above, so doctors can remove a scan they're permitted to view.

The patient-side SELECT/UPDATE policies already exist and stay untouched. Existing `auth.uid() = user_id` policies stay — the new ones are additive.

## 2. `useDocuments` hook — fetch patient's docs, not just doctor-owned

`src/hooks/useDocuments.ts` currently queries `.eq('user_id', user.id)`. Add an optional `patientId` argument:

```ts
export function useDocuments(patientId?: string) { ... }
```

When `patientId` is provided, query `.eq('patient_id', patientId)` (no `user_id` filter — RLS now decides). When omitted, keep the current `user_id = me` behaviour so `Documents.tsx`'s "Patient Documents" list (doctor's own docs across all patients) is unchanged.

`PatientProfile.tsx` switches to `useDocuments(id)` and drops the in-memory `doc.patient_id === patient.id` filter.

## 3. Reduce font sizes in Templates page to match the rest of the app

In `src/pages/Documents.tsx`, the Header & Footer cards and Content Template cards currently use `font-medium` (16px), `text-sm` (14px) descriptions, and `text-xs` (12px) meta — bigger than the standardised 11px used everywhere else. Bring all card text to the project's compact 11px standard:

| Element | Current | New |
|---|---|---|
| Card title (`h3`) | `font-medium` (~16px) | `text-[12px] font-semibold` |
| Description | `text-sm` | `text-[11px]` |
| Letterhead label / date | `text-xs` / `text-[11px]` | `text-[11px]` |
| "Create Header/Footer" / "Create Template" labels | `font-medium` | `text-[12px] font-medium` |
| Section descriptions under tab triggers | `text-sm` | `text-[12px]` |
| `Showing N of M documents` | `text-sm` | `text-[11px]` |

Inside the **Patient Documents** list (lines 599–683) bring row text down too:
- Document name `font-medium` (16px) → `text-[11px] font-semibold`
- Sub-line `text-sm text-muted-foreground` → `text-[11px]`
- Empty state `text-muted-foreground` → `text-[11px]`

Icon button sizes stay `h-8 w-8` / `h-4 w-4` so tap targets aren't shrunk.

## 4. Add AI Wizard for scans on the doctor's view

The patient-side `PatientDocuments.tsx` already has the analyse-medical-image flow (purple `Sparkles` button → calls `analyze-medical-image` edge fn → opens an analysis dialog with the disclaimer + Re-analyse). Mirror that on the doctor's Documents tab inside `PatientProfile.tsx`:

- Detect "scan" rows: `media_url` present **and** `media_type === 'image'` (or filename ends in `.jpg/.jpeg/.png/.webp/.heic`, or `.pdf` for radiology PDFs).
- For those rows, render an extra **Sparkles** icon button to the left of Preview, in the same `flex items-center gap-1` cluster.
- Click → `setAnalyzingDocId(doc.id)` + `supabase.functions.invoke('analyze-medical-image', { body: { imageUrl: doc.media_url, documentId: doc.id } })`.
- On success, persist `ai_analysis` and `ai_analyzed_at` (the edge function already does this via the documentId param) and open a small `<Dialog>` showing the image preview + analysis text + the standard amber medical disclaimer + a Re-analyse button. Reuse the exact dialog structure from `PatientDocuments.tsx` lines 919–997 — copy-paste, retypecast for the doctor's `Document` shape.
- If `doc.ai_analysis` is already populated, the Sparkles button shows "View" instead of triggering a fresh call (same logic as the patient side).

No new edge function, no new secrets — `analyze-medical-image` is already deployed.

## 5. Delete uploaded documents — doctors and patients

Both lists need a Trash icon for documents that are media uploads (no template). The doctor side already has Delete in `Documents.tsx` row (line 662) — keep as-is; just confirm RLS DELETE policy from step 1 lets a doctor delete a patient-uploaded scan.

Add the same Delete button to:

- **PatientProfile.tsx** Documents tab row (after Send): red `Trash2` icon, opens an `AlertDialog` "Delete this document? This cannot be undone." On confirm: `supabase.from('documents').delete().eq('id', doc.id)` + storage cleanup if `media_url` is present (`supabase.storage.from('patient-media').remove([extractedPath])`), then `fetchDocuments()`.
- **patient/PatientDocuments.tsx** row action cluster (line 864 area): same red `Trash2` button, gated to `doc.source === 'documents'` (don't let patients delete prescription/invoice rows from this view). Same confirm dialog + storage cleanup. After delete, refresh via `fetchAll()`.

Patients deleting their own uploaded scans is already permitted by the existing `Users can delete their own documents` policy. Doctors deleting patient-uploaded scans relies on the new policy from step 1.

## Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Add SELECT + DELETE RLS policies on `documents` for doctors with active access. |
| `src/hooks/useDocuments.ts` | Optional `patientId` argument; switches the SELECT filter accordingly. |
| `src/pages/PatientProfile.tsx` | Use `useDocuments(id)`; add Sparkles AI button + analysis dialog for image rows; add Delete button + confirm dialog; tighten any 16px text to 11px. |
| `src/pages/Documents.tsx` | Shrink template card and Patient Documents row typography to the 11–12px standard. |
| `src/pages/patient/PatientDocuments.tsx` | Add Delete (Trash2) button for `source === 'documents'` rows with confirm dialog + storage cleanup. |

## Out of scope

- Changing how scans are uploaded or stored (still goes to `patient-media` bucket).
- Touching templates' header/footer **rendering** sizes (only card UI typography).
- Adding bulk delete or undo. One-at-a-time with a confirm dialog.
- Sharing AI analysis results between doctor and patient — analysis is written once on the document row and is visible to both via the existing `ai_analysis` column (RLS already passes it through to whoever can see the row).

