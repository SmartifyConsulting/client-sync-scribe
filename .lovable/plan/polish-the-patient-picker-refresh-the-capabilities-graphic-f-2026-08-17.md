# Polish the patient picker, refresh the capabilities graphic, fix doctor landing + invite card

## 1. Patient selector dropdown (Sessions page)

The dropdown looks unfinished: the popover is a fixed 300px and doesn't line up with the trigger, the search field renders with a heavy teal focus ring that overflows the panel edges, and the empty state is a bare sentence floating in white space.

Changes in `src/pages/Sessions.tsx`:

- Match popover width to the trigger (`w-[--radix-popover-trigger-width]`) so panel and button align.
- Card treatment on the popover: rounded corners, subtle border and shadow from existing tokens (no new colours).
- Rework the search row: remove the boxed/ringed input, keep the magnifier inline with a clean bottom-border separator.
- Empty state: centred icon + "No patients found" title with a muted one-line hint.
- List rows: consistent height, token-based hover/selected states, small initials avatar instead of the generic person icon, tick right-aligned.
- Scrollable list capped at ~280px.

Selection logic, surname sorting, and data fetching stay as-is.

## 2. Capabilities wave image

`holarc-capabilities-wave.png` (landing page) is soft and the label text isn't crisp. Regenerate at higher resolution with the same composition — teal wave band behind three rows of white rounded pill badges with icons, same 14 labels — using the premium image tier for legible typography, then swap the asset pointer. Same teal brand colour.

## 3. Doctor sign-in lands on the patient dashboard

Confirmed cause: `RoleBasedRedirect` in `src/App.tsx` sends every non-provider role to `/my-dashboard`, so a doctor such as Dr Gianna Buttons lands on the personal/patient dashboard instead of her clinical one.

Fix: route users with a doctor role to `/doctor-dashboard`, nurses to their nurse dashboard, and keep `/my-dashboard` only for patient-only accounts. Doctors who also hold a patient role can still reach `/my-dashboard` from the sidebar/profile switcher.

## 4. Patient invitation card (doctor dashboard)

In `src/components/doctor/DoctorAccessRequests.tsx`:

- Change the card border from green to crimson red (new `--crimson` token in `index.css` + Tailwind config, no hardcoded hex in the component).
- Accept / Decline become normal-size buttons (`size="default"`), right-aligned at the bottom of the card — Decline as outline, Accept as the primary/crimson action.
- Add an "What this doctor will be able to see" block inside the card, split into two lists:

  **Granted to the invited doctor**
  - Patient profile & contact details
  - Appointments / calendar with this patient
  - Session summaries and clinical notes
  - Prescription history and repeats
  - Documents the patient has shared
  - Ability to add tasks, prescriptions and documents for this patient

  **Not granted**
  - The patient's private Emotional Journal / Ask Holarc conversations
  - Records from other practitioners the patient has not shared
  - The patient's billing/subscription details
  - Any ability to remove or edit another doctor's records

  **Other doctors on the patient's panel**
  - See only what the patient has explicitly shared with them; each doctor's access is granted per invitation and can be revoked by the patient at any time from their Access Management screen.
  - Round Table discussions are visible to practitioners the patient has connected, so notes posted there are shared with the panel.

  Rendered as two compact columns with tick / cross icons so it reads at a glance.
