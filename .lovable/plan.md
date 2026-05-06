# SOS Revamp + Incident Photos

## 1. Visual revamp — `HolarcHelpHome.tsx` (idle state)

Keep the existing brand colours (red `#E01837` SOS, teal primary, cream warning). Tighten the screen so the SOS button is unmistakably the hero element on mobile and looks more polished:

- **Header band**: keep the existing top bar; no change.
- **Emergency Contact warning card**: replace the plain amber card with a softer rounded `2xl` cream card (`bg-secondary/40` + `border-amber-300/60`), warning icon in a circular badge, slightly tighter copy, and the CTA button styled `bg-primary` (teal) with full width on mobile.
- **"Tap to send / SOS" label**: smaller, more refined — uppercase tracked label in muted-foreground, then `SOS` in bold display weight.
- **Hero SOS button**:
  - Bigger circular button with a layered look: outer pulsing ring (animate-ping at low opacity, red), a soft red glow shadow, and the solid red gradient core.
  - Inside: stacked "SOS" wordmark with a tiny "Hold or tap to send" hint.
  - Active/triggering state: spinner + "Sending…".
  - Subtle hover/active scale.
- **Quick actions row** below the button: two equal pill cards (Find nearby provider / Incident history) using `Card` with icon-in-circle on the left, title + one-line description, chevron on the right. Touch target ≥ 56px.
- **Active emergency banner** (when there's an existing incident): keep but restyle to match — red rounded card with pulsing dot, and a primary "View live status" button.
- **"Help is on the way" full-screen state**: keep functionality, restyle the green button into a card with checkmark badge, status text, and a teal "View live tracking" button.

All restyling uses existing semantic tokens (`bg-card`, `border`, `text-muted-foreground`, `bg-primary`, etc.) — no new colours, no new fonts.

## 2. SOS-active provider list — same screen

Tighten the list: each provider row becomes a `Card` with rounded-2xl, larger icon tile, name + meta on two lines, and a teal `Request` button. "Full capacity" badge becomes a small red pill chip rather than greyed-out text.

## 3. Photo capture & upload on an incident

### Database (migration)

New table `public.holarchelp_incident_photos`:
- `id uuid PK`
- `incident_id uuid not null references holarchelp_incidents(id) on delete cascade`
- `uploaded_by uuid not null` (the user who uploaded)
- `storage_path text not null`
- `caption text`
- `created_at timestamptz default now()`
- Index on `incident_id`.

RLS:
- Patient who owns the incident: full insert/select/delete on their incident's photos.
- Assigned provider staff (via `is_ambulance_staff` / `is_hospital_staff`) and admins: select only.
- Triggering user (`triggered_by_user_id`, e.g. doctor who started SOS for a patient): select + insert.

### Storage bucket

New private bucket `holarchelp-incident-photos`. Policies on `storage.objects`:
- Path convention: `{incident_id}/{uuid}.{ext}`
- Insert allowed if user can insert into `holarchelp_incident_photos` for that incident (same access rules above).
- Select allowed if user is patient owner / assigned provider staff / admin.
- Files served via signed URL (1 hour) since bucket is private (medical context).

### UI — `HolarcHelpIncidentDetail.tsx`

Add an **"Incident photos"** section between the voice note and the timeline:
- Reusable `IncidentPhotoCapture` component.
- Capture button that uses a hidden `<input type="file" accept="image/*" capture="environment" multiple>` so mobile browsers open the camera by default; desktop falls back to file picker.
- Optional caption per upload.
- Thumbnail grid (3 columns on mobile) with click-to-enlarge dialog.
- 5MB-per-image cap (project-wide upload constraint), client-side validation with toast.
- Compress / resize down to max 1600px on the long edge before upload (browser canvas) to keep things fast.
- Upload via `supabase.storage.from('holarchelp-incident-photos').upload(...)`, then insert row into `holarchelp_incident_photos`. List re-fetched on success.
- Provider portal `ProviderIncidentDetail.tsx` gets the same gallery in **read-only** mode (no upload control).

### Out of scope

- AI analysis of photos.
- Annotation / drawing on photos.
- Sharing photos in the timeline events feed (they already appear in the dedicated section).
- Changes to the SOS dispatch / severity / voice-note flows.
- Provider-side photo upload (read-only for now).

## Files touched

- `src/modules/holarchelp/pages/HolarcHelpHome.tsx` — visual revamp
- `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` — embed photo gallery
- `src/modules/holarchelp/pages/provider/ProviderIncidentDetail.tsx` — embed read-only gallery
- `src/modules/holarchelp/components/IncidentPhotoCapture.tsx` — new
- `src/modules/holarchelp/components/IncidentPhotoGallery.tsx` — new (shared, supports `readOnly`)
- `supabase/migrations/<new>.sql` — table + RLS + bucket + storage policies
