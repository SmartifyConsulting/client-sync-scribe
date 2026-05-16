## Follow-through on the 3 pending items

### 1. Global realtime SOS modal-toast for emergency contacts
Add a top-level `SosAlertListener` mounted in `App.tsx` (inside the authed shell) that:
- Subscribes via Supabase Realtime to `notifications` rows where `user_id = auth.uid()` and `type = 'sos_alert'`.
- On insert, fires a full-screen red modal (siren icon, patient name, "Open live tracking" CTA → navigates to `/track/{token}` parsed from `link`) plus a `sonner` toast fallback.
- Also plays a short audio ping (existing `/public` asset or Web Audio beep) and vibrates the device (`navigator.vibrate`) if supported.
- Deduplicates against already-seen notification IDs in `sessionStorage`.

### 2. Patch Paraskevoula's emergency contact + verify end-to-end
- Identify her `emergency_contacts` / `holarchelp_emergency_contacts` row for Andreas Soldatos.
- Set `email = andreas.test@holarchealth.test` (or reuse an existing seeded test auth user) and link `contact_user_id` to that auth user.
- Trigger an SOS as Paraskevoula via `dispatch-sos` edge function.
- Verify:
  - A `notifications` row lands for Andreas with `type='sos_alert'`, `priority='critical'`, correct `link`.
  - A `patient_profile_shares` row exists with `can_view_live_tracking=true`, owner=Paraskev, viewer=Andreas.
  - No Mailgun call was made (check `share-incident-with-contacts` logs).
- Report results back inline.

### 3. Seed provider logins
- Invoke the deployed `seed-provider-logins` edge function once as admin (dry-run first to count, then live).
- Capture the returned `{ created, updated, skipped }` summary plus a sample of generated temporary passwords.
- Persist the credentials list to `/mnt/documents/provider-logins-seed.csv` so the user can distribute them manually.
- Spot-check 2 ambulances + 2 hospitals: confirm `auth.users` row exists with matching `contact_email`, `owner_id` on the provider points to it, and `user_roles` has `ambulance_staff` / `hospital_staff`.

### Order of execution
1. Build & wire `SosAlertListener` (item 1) — pure frontend.
2. Run seed-provider-logins (item 3) — backend invocation, independent.
3. Patch Andreas's contact and trigger test SOS (item 2) — depends on item 1 for visual verification but DB verification works regardless.

No schema changes required. Only one new file (`src/components/SosAlertListener.tsx`) + mount in `App.tsx`; everything else is data + edge-function invocation.
