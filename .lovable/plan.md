## Scope

Five changes across HolarcHelp SOS UX, the patient and doctor editors, and the SOS contact form layout.

---

### 1. SOS acknowledgements — remove last checkbox

File: `src/modules/holarchelp/pages/HolarcHelpHome.tsx`

- Drop item `d` ("Emergency response availability and response times may vary by location.").
- Reduce `AckKey` to `"a" | "b" | "c"`, default state `{a,b,c:false}`, `allAck = a && b && c`.
- Bump `ACK_KEY` to `holarchelp.sos.ack.v3` so stale v2 state with `d:true` doesn't carry over.
- Update toast string to "acknowledge all three statements".

### 2. Back navigation on the SOS Emergency Contacts page

File: `src/modules/holarchelp/pages/HolarcHelpContacts.tsx`

- Add a "Back" link (ChevronLeft + label) at the top that calls `navigate("/patient/holarchelp")`, so the user stays inside the SOS flow instead of being stranded.
- Style as small ghost button above the H1, matching other in-module back links.

### 3. Default SOS contacts from Personal Information + redesigned contact form

The dispatcher reads `holarchelp_emergency_contacts`. Patients keep a separate `patients.emergency_contacts` JSON list under My Holarchive → Personal info (`EmergencyContactsInline`). We will seed the SOS list from that source AND modernise the form.

Seeding (`HolarcHelpContacts.tsx`):
- After first `load()`, if `holarchelp_emergency_contacts` is empty AND `patients.emergency_contacts` has entries, insert one SOS row per personal-info contact (name, phone, email, relationship, default `notify_min_severity = "low"`). Then re-`load()`.
- Idempotent: only seed when SOS list is empty, never duplicate after manual edits.
- Show a small banner: "Defaults from your Personal Information. Add or edit here for SOS-specific severity rules."

Form redesign (same file):
- Replace the stacked single-column form with a tighter two-column grid on `md+` (Name + Relationship on row 1, Phone + Email on row 2, Severity full-width on row 3), matching `EmergencyContactsInline` so both surfaces feel like the same product.
- Move the contact list above the "Add contact" form on desktop (list-first), with the Add form inside a Collapsible (default closed) so SOS contacts are scannable at a glance.
- Per-row card: avatar circle with initials, name + relationship as title, phone/email below, severity Select inline-right, trash icon at far right. Match the teal-bordered card pattern from the global accordion policy.
- Add inline edit (pencil) on each row that flips the row to editable inputs and autosaves on blur (mirrors patient editor behaviour from §4).

### 4. Always-editable Personal & Medical info with autosave (patient AND doctor)

File: `src/features/patients/components/PatientDetailsEditor.tsx` for both code paths (the same component is used for self-service patients and for doctors editing a patient).

Currently the editor uses an `isEditing` toggle: fields render as disabled `ViewField`s until pencil click; explicit Save button required.

Changes:
- Force `isEditing = true` permanently on mount, regardless of `isSelfService`. Hide all pencil edit-toggle buttons and the Save / Cancel footer for both patient and doctor flows.
- Autosave: debounce (~600 ms) `performSave(formData, surgeries)` on changes to `formData`, `surgeries`, `pharmacies`, `familyHistory`, `nokMembers`, `currentMedications`, `conditionsDiagnoses`, `organDonorOrgans` whenever `hasChanges` is true.
- Replace the Save button area with a small inline status indicator (Loader2 + "Saving…" / Check + "Saved · just now" / AlertCircle + "Couldn't save — retry").
- Optimistic UI: keep local state on save failure, surface toast, retry on next change.
- Keep server-side guarantees through existing RLS — no client-side role check changes.

### 5. Schema & edge-function changes

Schema (`supabase/migrations/...`):
- Add columns to `holarchelp_emergency_contacts`:
  - `source` text NOT NULL DEFAULT 'manual' CHECK (`source` in ('manual','personal_info_seed')) — lets us tell seeded rows apart so a future re-sync can replace stale ones safely.
  - `personal_info_ref` text NULL — stable id matched to the JSON contact's `id` in `patients.emergency_contacts`, so re-seeding is idempotent per contact.
- Add a partial unique index on `(user_id, personal_info_ref)` where `personal_info_ref IS NOT NULL` to prevent duplicate seeds.
- Add `updated_at` trigger using existing `public.update_updated_at_column()` if not already present.
- No RLS changes (existing per-user policies cover the new columns).

Edge functions:
- `dispatch-sos` and `share-incident-with-contacts`: when assembling the recipient list, fall back to `patients.emergency_contacts` JSON if `holarchelp_emergency_contacts` returns zero rows for the user. This guarantees an SOS triggered before the user ever opens the SOS Contacts page still notifies the personal-info contacts.
- Add a new `seed-sos-contacts-from-personal-info` edge function (admin-callable, also called by the contacts page on first open) that performs the upsert server-side using the service role, keying on `personal_info_ref`. The client just invokes it; no direct table writes from the browser for the seed path. Validate input with zod.
- Update `notify-next-of-kin` to dedupe phone/email across both sources so a person listed in personal info AND added manually only gets one message.
- Deploy: `dispatch-sos`, `share-incident-with-contacts`, `notify-next-of-kin`, `seed-sos-contacts-from-personal-info`.

---

## Files touched

- `src/modules/holarchelp/pages/HolarcHelpHome.tsx`
- `src/modules/holarchelp/pages/HolarcHelpContacts.tsx`
- `src/features/patients/components/PatientDetailsEditor.tsx`
- `supabase/migrations/<new>.sql`
- `supabase/functions/dispatch-sos/index.ts`
- `supabase/functions/share-incident-with-contacts/index.ts`
- `supabase/functions/notify-next-of-kin/index.ts`
- `supabase/functions/seed-sos-contacts-from-personal-info/index.ts` (new)
