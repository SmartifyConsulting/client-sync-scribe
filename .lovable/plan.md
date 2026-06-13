## Goal
1. Notify Next of Kin / Emergency Contacts when a patient misses a chronic or daily medication dose.
2. Optionally also alert them when the patient **does** take the dose.
3. Show a one-time navigation tip on every screen the first time a user visits it (never again after that).

---

## Part A — Missed-medication notifications

### 1. Per-medication alert settings (at setup time)
When a medication is added or edited (`PrescriptionEditor`, `DailyMedsInline`), the existing fields (times, dose, frequency) get two new inputs in the same form:

- **"Alert if missed after"** — number input + unit selector (minutes / hours). Default 30 min. Stored as `prescriptions.missed_alert_after_minutes integer default 30`.
- **"Also alert contacts when I take this dose"** — checkbox, default off. Stored as `prescriptions.alert_contacts_on_taken boolean default false`.

### 2. Per-contact opt-in
In `EmergencyContactsSection.tsx` and the NOK editor, two toggles per contact:
- **"Alert when I miss medication"** (`notify_on_missed_medication`, default off)
- **"Alert when I take medication"** (`notify_on_taken_medication`, default off)

Stored inside the existing `patients.emergency_contacts` / `next_of_kin_members` jsonb.

### 3. Patient master switches (Settings → Notifications)
- "Alert my Emergency Contacts if I miss medication" (default on) → `profiles.notify_contacts_on_missed_meds`
- "Alert my Emergency Contacts when I take medication" (default off) → `profiles.notify_contacts_on_taken_meds`

Master + per-contact + per-med must all be on for the alert to fire.

### 4. Missed-dose detection (backend)
Scheduled edge function `check-missed-medications`, cron every 5 min.

For each active chronic/daily `prescriptions` row, for each `reminder_times` slot whose scheduled datetime is ≥ `missed_alert_after_minutes` in the past (within a 10-min lookback window):
- If `medication_adherence` for `(prescription_id, scheduled_date)` is missing or `status='pending'`, upsert with `status='missed'`, set `missed_alert_sent_at=now()`.
- Patient gets in-app notification.
- Each opted-in contact gets in-app notification (if linked user) + email via `send-email` + optional SMS.

`missed_alert_sent_at` prevents duplicates.

### 5. Taken-dose notification
DB trigger on `medication_adherence`: when status transitions to `taken`/`auto_approved` and all opt-in conditions are true, notify opted-in contacts. `taken_alert_sent_at` prevents duplicates.

### 6. Notification types
- `medication_missed_self`, `medication_missed_contact`, `medication_taken_contact` — surface in bell dropdown and `/notifications`.

### 7. `is_chronic` flag
Add `prescriptions.is_chronic boolean default false` and a checkbox in `PrescriptionEditor`.

### Migration
```text
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS is_chronic boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS missed_alert_after_minutes integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS alert_contacts_on_taken boolean DEFAULT false;

ALTER TABLE medication_adherence
  ADD COLUMN IF NOT EXISTS missed_alert_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS taken_alert_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_alerts_sent jsonb DEFAULT '[]'::jsonb;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_contacts_on_missed_meds boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_contacts_on_taken_meds boolean DEFAULT false;
```

---

## Part B — First-visit navigation tips

### Behaviour
The first time an authenticated user lands on any route, a small **tip card** (popover-style, anchored to the page header / main nav item for that screen) fades in. It contains:
- Screen name (e.g. "My Holarchive")
- 1–2 sentence orientation: what this screen does and the main action
- A **"Got it"** button that dismisses and marks the screen as seen forever
- An auto-dismiss after 8 s also marks it seen

Once marked seen, the tip never appears for that user again — even after logout, new device, or browser change.

### Tip content registry
Single file `src/lib/screenTips.ts` exporting a typed map:
```text
{ routePattern: '/patient/details', title: 'My Holarchive', body: '...' }
```
One entry per top-level screen (~25 entries: Dashboard, My Holarchive, My Doctors, Prescriptions, Sessions, Documents, Calendar, Tasks, Rewards, SOS, Settings, Doctor Dashboard, Patients, Invoices, Admin, etc.). Each entry has a stable `id` (the storage key).

### Persistence — cross-device, never repeat
Server-side per user: new table `public.user_screen_tips_seen`.

```text
CREATE TABLE public.user_screen_tips_seen (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_id text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tip_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_screen_tips_seen TO authenticated;
GRANT ALL ON public.user_screen_tips_seen TO service_role;
ALTER TABLE public.user_screen_tips_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own tip flags"
  ON public.user_screen_tips_seen FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

DELETE permission lets a "Reset tips" button in Settings re-show all tips.

### Implementation
- New hook `useScreenTip(tipId)` — on mount, queries `user_screen_tips_seen` once (React Query, cached for session); returns `{ shouldShow, dismiss }`. `dismiss()` inserts the row (upsert ignore conflict) and updates cache.
- New component `ScreenTip.tsx` — small dismissible popover/card with teal border (matches Style Manifest), "Got it" + close (X) buttons, 8 s auto-dismiss timer.
- Mounting strategy: a single `<RouteTipHost />` placed inside the authed layout wrapper. It reads `useLocation()`, looks up the matching tip in `screenTips.ts`, and renders `<ScreenTip />` if found and `shouldShow`. No per-page wiring required.
- Hidden on `/auth`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/challenge`, public SOS tracking pages.
- "Reset all tips" button in Settings → Preferences → deletes all rows for the user from `user_screen_tips_seen`.

### Out of scope (tips)
- Multi-step product tours (existing `DashboardTour` stays untouched and unrelated).
- Per-element tooltips inside a screen — only one orientation tip per route.
- Localised translations (English only for v1; copy lives in `screenTips.ts` and can be translated later).

---

## Files touched

**Migrations** — one for med columns + master switches, one for `user_screen_tips_seen`.

**Edge functions** — `check-missed-medications` (+ pg_cron `*/5 * * * *`), optional `notify-contacts-medication-taken` (or pure trigger fanout).

**Frontend**
- `PrescriptionEditor.tsx`, `DailyMedsInline.tsx` — add `is_chronic`, `missed_alert_after_minutes`, `alert_contacts_on_taken`.
- `EmergencyContactsSection.tsx` + NOK editor — two new per-contact toggles.
- Settings notifications panel — two master switches + "Reset tips" button.
- `src/lib/screenTips.ts` — tip registry.
- `src/hooks/useScreenTip.ts` — hook.
- `src/components/ScreenTip.tsx` + `src/components/RouteTipHost.tsx` — UI.
- Authed layout wrapper — mount `<RouteTipHost />`.

## Out of scope (overall)
- Native push notifications (uses in-app + email).
- SMS gateway changes (reuse existing).
- Per-contact custom miss-windows (window is per-medication).
