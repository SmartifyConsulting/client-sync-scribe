# Doctor profile + post-session flow rework

## 1. Doctor bottom nav: Rewards → SOS

`src/components/layout/BottomNav.tsx` (`doctorNavItems`):
- Replace the 5th item (Gift "Rewards" → `/doctor/rewards`) with `{ icon: Siren, label: "SOS", to: "/doctor/holarchelp", danger: true }`.
- Mirror the patient `danger` styling so the SOS icon/label render in red.

Routing:
- `src/App.tsx`: add `<Route path="/doctor/holarchelp/*" element={<HolarcHelpRoutes />} />` (same component the patient route uses).
- `useHolarcHelpAccess()` already returns `enabled: true` for everyone, so the SOS module just works for doctors too.

## 2. Move "Rewards" into My HolaPrac as a 4th tab

`src/pages/MyPractice.tsx`:
- Add a 4th `<TabsTrigger value="rewards">My Rewards</TabsTrigger>` to the right of Credentials.
- Add matching `<TabsContent value="rewards">` that renders `<DoctorRewards embedded />`.
- Update `DoctorRewards.tsx` to accept an optional `embedded` prop that suppresses its own page header / outer padding when shown inside the tab.

Sidebar (desktop) + TopBarIcons: keep the `/doctor/rewards` link working as a deep-link, but the primary entry point becomes the tab. No nav change for desktop.

## 3. Re-sequence "session complete" flow

Current order on `Sessions.tsx` end of session: Visit-category (Vula award) → AI doc review dialogs (Med cert / Prescription / Invoice / Referral).

New order:
1. **Documents first.** After `handleSessionComplete()` succeeds, immediately show the AI-extracted document review dialogs (Med Cert → Prescription → Invoice → Referral) — same dialogs as today, but no Visit-category gate in front of them.
2. **Follow-up appointment placeholder dialog** opens after the last document is approved/skipped.
3. **Vula award dialog** (`VisitCategoryDialog`) opens after the follow-up dialog closes.

Implementation:
- `Sessions.tsx`: introduce a small queue/state-machine (`postSessionStep: 'docs' | 'followup' | 'vula' | 'done'`). Trigger `setPostSessionStep('docs')` inside `handleSessionComplete`. When all available doc dialogs have been handled, advance to `'followup'`, then `'vula'`.
- Remove the current call to `setShowVisitCategoryDialog(true)` from the recording-end handlers; that dialog is now driven by the queue.

## 4. New `FollowUpAppointmentDialog`

New file: `src/features/sessions/components/FollowUpAppointmentDialog.tsx`.

Behaviour:
- Header: "Schedule follow-up with {patientName}".
- Calendar picker (date) + 30-min slot grid (7am–6pm) reusing the slot logic from `BookAppointmentDialog`.
- Pulls **the doctor's own busy slots** from `appointments` where `user_id = doctor`.
- Two action buttons:
  - **Set follow-up** — primary, disabled until a slot is chosen.
  - **Ignore** — secondary; closes the dialog without booking and advances the queue. Tooltip: "No follow-up needed."
- "Set follow-up" creates an appointment row in `public.appointments`:
  - `user_id = doctor.id`, `patient_id = currentPatient.id`,
  - `start_time` / `end_time` for the slot,
  - `title = 'Follow-up — {patient name}'`, `type = 'follow_up'`.
- Both parties see it as accepted because it is written directly into `appointments` (not `appointment_requests`). Patient calendar already reads `appointments`.
- On success we also insert a `notifications` row for the patient: "Follow-up booked for {date} at {time}".

## 5. Patient can see doctor's calendar when (re)scheduling

`src/features/appointments/components/BookAppointmentDialog.tsx`:
- The `fetchBusySlots` call already greys out busy slots — it queries `appointments.user_id = doctorId`. RLS already lets the patient read appointments where they're the patient or where the row exposes only `start_time`/`end_time` aggregates? **Add migration** if needed:
  - Policy: `CREATE POLICY "patients see doctor busy slots" ON public.appointments FOR SELECT USING (auth.uid() IS NOT NULL);` — restricted to authenticated and only the columns we read (`start_time`, `end_time`, `user_id`).  Since RLS is row-level (not column-level), use a view: `public.doctor_busy_slots` with `(doctor_id uuid, start_time, end_time)` and grant select to authenticated.
  - Update `fetchBusySlots` to query `doctor_busy_slots` instead of `appointments`.
- Add a sub-header in step 3: "Greyed-out times are already booked. Pick any open slot to request a reschedule."
- The reschedule path (already existing in `BookAppointmentDialog`) inherits this same view.

## 6. Files touched

- `src/components/layout/BottomNav.tsx` — replace doctor Rewards with SOS.
- `src/App.tsx` — add `/doctor/holarchelp/*` route.
- `src/pages/MyPractice.tsx` — add Rewards tab.
- `src/pages/doctor/DoctorRewards.tsx` — accept `embedded` prop.
- `src/pages/Sessions.tsx` — post-session step machine; reorder dialogs.
- `src/features/sessions/components/FollowUpAppointmentDialog.tsx` — NEW.
- `src/features/appointments/components/BookAppointmentDialog.tsx` — query the new view, add helper text.
- New migration: `doctor_busy_slots` view + grant.

## 7. Out of scope

- No changes to `VisitCategoryDialog` itself (only its trigger order moves).
- Existing patient/calendar pages don't need changes beyond reading the new view (they already display `appointments`).
- Notifications wording for follow-up cancellations is unchanged in this round.
