Revised plan — 7 items. SOS notification flow switches to **in-app notifications only** (no email/SMS/WhatsApp), and the confirmation UI is replaced by routing straight to the responder list.

## 1. Vula counter animates twice

**Cause:** `AnimatedCounter` in `src/features/patients/components/PatientDetailsEditor.tsx` (line 353) resets to 0 every time `target` changes. `lollipopCount` arrives in two passes (initial render with 0 → real value once query resolves), so the count visibly animates 0→N twice.

**Fix:** In `AnimatedCounter`, animate from the *previous* `count` to the new `target` instead of restarting from 0, and skip the animation when `target` is unchanged. One pass only.

## 2. Seed login email for every hospital and emergency provider

**State (verified in DB):** All 38 ambulances and 84 hospitals already have `contact_email`, `owner_id`, and names. What's missing is a guaranteed `auth.users` row for each `contact_email` so the provider can actually sign in.

**Plan:** Add an admin-only edge function `seed-provider-logins` that, per provider row:
- looks up `auth.users` by `contact_email`
- if missing, calls `admin.createUser` with that email + a temporary password (email_confirm = true)
- updates `owner_id` to point at that auth user
- inserts the matching role into `user_roles` (`ambulance_staff` / `hospital_staff`)
- returns a summary list (created vs already-existed)

Run once from admin Cloud. No app-wide email blast — credentials returned in the response for you to share manually, since the user has asked for no automated email.

## 3. Why "Unknown ambulance / hospital" shows in nearby SOS responders

**Diagnosis (DB + code verified):**
- `AvailableResponders.tsx` reads provider rows from the **patient session**.
- RLS policy `Public can view approved active *` only exposes rows where `status='approved' AND subscription_status='active'`.
- 4 ambulances (3 approved/inactive + 1 pending) and 3 hospitals (approved/inactive) fail that filter.
- `dispatch-sos` (service role) still creates offers for those providers because it doesn't filter on `subscription_status`. Patient receives the offer but can't read the provider row, so the name falls back to "Unknown ambulance/hospital".

**Recommendation (report only, not auto-fixed unless confirmed):** tighten `dispatch-sos` to filter `subscription_status='active'`, **or** expose a SECURITY DEFINER RPC `get_provider_summary(ids[])` that returns name/ownership for any offered provider so the UI never shows "Unknown".

## 4. Rewards "Categories" list font size

Bring the Recent Rewards list rows in `src/pages/patient/MyRewards.tsx` (~line 524) into line with other list views (MyDoctors, PatientDocuments): `text-sm font-medium` for the label, `text-xs text-muted-foreground` for the date, and `h-5 w-5` icons across breakpoints (drop the mobile-only `h-9 w-9` upscaling). Same treatment for the badge image inside the Vula count.

## 5. SOS confirmation view: remove the searching spinner row, route to responder list

In `src/modules/holarchelp/pages/HolarcHelpHome.tsx` (lines 230–296):

- **Delete the entire 3-step confirmation block** (Location shared / Contacts notified / Searching for nearby providers).
- After a successful `triggerSOS()`, navigate the patient **directly to** `/patient/holarchelp/incident/{incidentId}` (which already renders `AvailableResponders` — the list of nearby ambulances + hospitals to pick from) instead of showing the in-page confirmation. Keep the 10-second "Cancel alert" affordance, but render it as a sticky banner inside the incident page (small follow-up change in `HolarcHelpIncidentDetail.tsx`) rather than blocking the responder list behind a separate screen.
- **Move the reassurance copy** to a small static notice rendered *under* the big SOS button on the landing screen (always visible, no spinners):
  > "Tapping SOS shares your location and notifies your emergency contacts."

## 6. SOS acknowledgement checkboxes ticked by default

In the same file, change the initial state (line 38) from `{ a: false, b: false, c: false }` to `{ a: true, b: true, c: true }` so users can hit SOS immediately. Still un-tickable, still session-only (not persisted).

## 7. Notify Paraskevoula's emergency contact — **in-app only**

**Switch from email/SMS to a high-priority in-app notification.** No Mailgun, no AT (SMS), no WhatsApp.

**Implementation:**

1. **Edit `share-incident-with-contacts` edge function** (the existing dispatcher) so it does the following instead of sending email:
   - Resolve each emergency contact to a HolarcHealth `auth.users` row by matching `emergency_contact_email` (and the `emergency_contacts[].email` / `next_of_kin*.email` lists) against `profiles.email`/`auth.users.email`.
   - Insert one row per matched contact into `notifications`:
     ```
     user_id        = contact's auth user id
     type           = 'sos_alert'
     priority       = 'critical'
     title          = '🚨 {Patient name} triggered an SOS'
     description    = 'Tap to view live location and current status.'
     reference_id   = incident_id
     link           = /track/{tracking_token}
     ```
   - Also insert a row into `patient_profile_shares` (or the equivalent share table) for that contact with `can_view_live_tracking = true` and `can_view_profile = true`, scoped to this incident — so the SOS record is **automatically shared** with the contact and they can open it from the notification without an extra step.
   - Insert an audit row into `holarchelp_messaging_log` with `channel='in_app'`, `status='sent'`.
   - Stop calling Mailgun entirely. Remove the email HTML template.

2. **Frontend — large emergency notification UI:**
   - In the notifications dropdown / centre, render notifications with `type='sos_alert'` as a full-width red banner with siren icon, pulsing border, and a primary "Open live tracking →" CTA. (Existing `src/pages/Notifications.tsx` + `BottomNav` indicator already have a notification list — add a special case for this type.)
   - Add an in-app **modal toast** that auto-pops the moment a `type='sos_alert'` row arrives via the existing realtime `notifications` subscription, so a contact who has the app open sees the SOS the instant it's raised.
   - On tap → navigate to `/track/{tracking_token}` (the public live tracking page already exists).

3. **For Paraskevoula's contact specifically:**
   - DB check just run: her EC is `Andreas Soldatos`, phone only, no email and no linked auth user. So today, even after the in-app dispatch is wired, **Andreas would not receive anything** unless he installs HolarcHealth and his contact record stores his app email.
   - I'll add Andreas's email + link his test auth account to her record so the next SOS test can verify the in-app notification arrives end-to-end.

4. **Verify** by triggering an SOS as Paraskev, then reading the `notifications` and `patient_profile_shares` tables to confirm a `sos_alert` row was inserted for Andreas and the incident was auto-shared. Take a screenshot of the banner on Andreas's logged-in session.

---

Approve and I'll execute items 1, 4, 5, 6 (frontend), strip email/SMS from `share-incident-with-contacts` and switch it to in-app notifications + auto-share (item 7), deploy the `seed-provider-logins` edge function (item 2), and report back on item 3 with the chosen mitigation.
