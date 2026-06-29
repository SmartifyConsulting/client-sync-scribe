# Plan

## 1. Remove "Sign in as NEMS Dispatcher (DEV Only)"
- Delete `src/components/auth/DevErLoginButton.tsx`.
- Remove its import and usage from `src/pages/Auth.tsx`.
- Grep for stragglers so the button can't return.

## 2. Side-by-side Sign In / Sign Up tabs
File: `src/pages/Auth.tsx`.
- Replace the current "two-page" split with a single auth card whose top has **"Sign In" and "Sign Up" tabs** rendered side-by-side via shadcn `Tabs` (`grid-cols-2`, equal width).
- Tab state replaces the `isLogin` boolean. Selecting "Sign Up" reveals the existing multi-step signup wizard inside the same card; "Sign In" shows the email/phone form.
- Drop the standalone oversized "Create your free account" CTA since the tab makes signup equally prominent.
- Preserve auth UX rules: `tabIndex={-1}` on Forgot Password, password eye toggles, `/forgot-password` and `/reset-password` flows.

## 3. Move security trust pills to the bottom of the sign-in card
- In `src/pages/Auth.tsx`, move the "Your data is encrypted / 2FA required / HIPAA-aligned" trust band so it renders **under** the auth card. Same compact pill styling as the screenshot. Applies to both tabs.

## 4. Sidebar nav reorder
Files: desktop sidebar (`src/components/layout/AppSidebar.tsx` or equivalent) and mobile bottom nav.
- Move **My Practice** to sit directly under **Home**.
- Move **My Sessions** to sit directly under **My Calendar**.
- Keep route paths, icons, and translation keys unchanged — reorder the items only. Apply the same order to mobile nav so desktop and mobile match.

## 5. SOS incident recording — +5s and no hallucinated transcripts
- `src/modules/holarchelp/components/SosVoiceNoteDialog.tsx`: bump `MAX_SECONDS` 65 → **70**, update visible counter.
- `src/modules/holarchelp/components/IncidentVoiceNoteRecorder.tsx`: same 70s cap; guard so that if no audio blob was captured (cancel / mic blocked / 0-byte clip) we skip the transcription edge function and skip inserting a `holarchelp_voice_notes` row. Toast "No recording captured".
- Strictly discard whitespace / "[inaudible]" placeholder transcripts so nothing fabricated is persisted.

## 6. Hospital Admission logging
File: `src/features/sessions/admissions/ManualLogAdmissionDialog.tsx`.

a. **Hospital dropdown** — replace free-text Hospital input with a Combobox of `holarchelp_hospitals` (approved/active). Selection writes `hospital` (name) and `hospital_provider_id` (id). Keep a "Type a hospital not listed" free-text fallback.

b. **Clinical codes field** — repeatable rows of `{ code, description }` (ICD-10 / CPT / procedure) with Add / Remove. Persist as JSONB.

Migration:
```
ALTER TABLE public.hospital_admissions
  ADD COLUMN IF NOT EXISTS codes jsonb NOT NULL DEFAULT '[]'::jsonb;
```
No new table → existing policies cover the new column.

Render codes as chip list in `AdmissionsView.tsx` and `HospitalAdmissionEditor.tsx`.

## 7. Baseline recording explainer (one-time AI training)
File: `src/features/rewards/components/PillBaselineCapture.tsx`.

Expand the "Why we do this" block:
- **What a baseline is** — one short video of you taking the medication normally; the AI watches hand/pill/mouth motion *once* to learn your pattern so future check-ins are auto-verified.
- **One-time only** — you'll never be asked to repeat it for this medication.
- **Privacy** — used only to compare against future adherence clips.

Add an **"If you skip this medication"** sub-panel:
- Reads `emergency_contact_*` and `next_of_kin_*` from `patients`; shows "We'll notify: **{name} ({relationship})**".
- If both empty OR user chooses to override, inline picker:
  - Radio: **Emergency contact / Next of kin / No one**
  - Inline fields to fill name + phone + email if missing (writes back to `patients`).
- Persist chosen target on `prescriptions` as `skip_notify_target` ('emergency' | 'nok' | 'none') and `skip_notify_contact` jsonb snapshot (add columns via migration; null = use patient-level default).

## Technical notes
- Hospital dropdown query: `holarchelp_hospitals` where `is_approved=true`, cached via React Query.
- Codes JSONB shape: `[{ "code": "S83.5", "description": "Sprain of cruciate ligament of knee" }]`. Validate non-empty `code`.
- All migrations run via `supabase--migration` with grants/RLS verified.

## Out of scope
- Existing SOS flow logic, prior stored transcripts, broader admissions styling.
