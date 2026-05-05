Seven related changes. Two clarifications from user incorporated: (a) patients **and** doctors **and** hospital providers can all manually create hospital admissions; (b) by default **only the Emergency Contact** is notified in SOS — NOK is opt-in.

## 1. Add "Emergency Contact" alongside Next of Kin (do not rename)

- DB additions to `patients`:
  - `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_email`, `emergency_contact_relationship`
  - `emergency_contacts jsonb default '[]'` (multiple, mirrors `next_of_kin_members`)
- Per-contact share flags stored on each jsonb item AND as top-level booleans for the primary entry:
  - `can_view_profile`
  - `can_view_live_tracking` (defaults: **Emergency Contact = true**, **NOK = false**)
- UI in `PatientDetailsEditor` / `MyDetails`: new "Emergency Contacts" section directly below the existing "Next of Kin" section, identical add/edit/list controls plus the two share toggles. Same toggles added to NOK rows.
- Existing `holarchelp_emergency_contacts` table reused for HolarcHelp dispatch, kept as-is.

## 2. Patient-controlled profile access (share with family by username)

New table `patient_profile_shares`:
```text
id uuid pk
owner_user_id uuid
shared_with_user_id uuid nullable
shared_with_username text nullable    -- profiles.mailbox_alias
shared_with_email text nullable
relationship text                     -- 'child','parent','spouse','other'
can_view_profile boolean default true
can_view_live_tracking boolean default false
source text                           -- 'manual' | 'nok' | 'emergency_contact'
linked_contact_id text                -- jsonb item id when source != 'manual'
created_at, updated_at
```
- RLS: owner CRUD; `shared_with_user_id = auth.uid()` SELECT.
- Typeahead by `profiles.mailbox_alias` or email; on save store both id and username.
- Toggling "share profile" / "share live tracking" on a NOK or Emergency Contact entry auto-creates/updates a matching share row.
- New helper `has_profile_share(_owner uuid, _viewer uuid)` for RLS.
- Extend SELECT RLS on `patients`, `prescriptions`, `medication_adherence`, `hospital_admissions`, `health_photos`, `holarchelp_incidents` to include `has_profile_share`.
- New page `src/pages/patient/SharedProfile.tsx` + route `/patient/shared/:username` (read-only) and "Profiles shared with me" sidebar entry.

## 3. Medication reminders (time + with/without food)

Schema additions to `prescriptions`:
- `reminder_times text[]`
- `with_food text` ('with_food' | 'without_food' | 'either')
- `refill_reminder_days int default 7`

- Edge function `send-medication-reminders` (cron every 5 min): for each active prescription, if current local time matches a slot ±5 min and no `medication_adherence` row for today's slot → notification "Time to take {medication} ({dosage}) — with food / on empty stomach".
- After patient marks taken, suppress further reminders for that slot.
- Refill: if projected runout is within `refill_reminder_days`, send "Time to refill your {medication} prescription".
- `pg_cron` schedule inserted via insert tool.

UI:
- Doctor prescription editor + patient self-med dialog gain time inputs, with/without food, refill days.
- `TodaysMedicationsCard` per dose: "Take now", "Taken at HH:MM", "Upcoming at HH:MM", "All doses taken today".

## 4. Clearer "already taken" message
Covered by #3 — explicit "✅ You've already taken your {medication} for today. Next dose: {next_time}".

## 5. Live-tracking share on SOS — Emergency Contact by default

- Use existing `holarchelp_incidents.tracking_token`.
- New edge function `share-incident-with-contacts` triggered after incident creation:
  - **Default recipients = Emergency Contacts only** (any with `can_view_live_tracking = true`, which itself defaults true for Emergency Contacts).
  - NOK contacts are notified **only** if their `can_view_live_tracking` flag is explicitly turned on.
  - Also notifies any `patient_profile_shares` row with `can_view_live_tracking = true`.
  - Sends WhatsApp/SMS/email with `/track/:token` link.
- SOS button in `HolarcHelpHome`: shows recipient preview before activating ("Will notify: {Emergency Contact name}"). If no Emergency Contact exists, prompt user to add one or temporarily include a NOK.
- Authenticated viewers (`shared_with_user_id` with live-tracking flag) get a "Live SOS" banner via extended RLS on `holarchelp_incidents`.

## 6. Patient-added daily (non-chronic) medications, gated by approved list

- New table `approved_daily_medications` (admin-curated): `id, name unique, category, default_with_food, notes, active`. Seed with vitamins/supplements/common OTC daily meds via insert tool.
- Extend `prescriptions` with `source text default 'doctor'` and `approved_medication_id uuid` FK.
- Patient UI in `MyDetails` → "My daily medications": typeahead bound to `approved_daily_medications`; selecting one creates a `prescriptions` row with `source='self'`, `doctor_id = patient_user_id`, frequency daily, plus reminder times + with/without food.
- Adherence + Vula rewards key off prescriptions, so self-meds qualify automatically.
- Doctors see self-added meds badged "Self-added".

## 7. Hospital admissions — patients, doctors AND hospital providers can create

- Migration on `hospital_admissions`:
  - `doctor_id` nullable
  - `created_by uuid not null` (auth.uid())
  - `source text` ('doctor' | 'patient' | 'hospital')
  - `hospital_provider_id uuid` nullable, FK → `holarchelp_hospitals.id` (set when source='hospital')
- Extend INSERT RLS to allow any of:
  - `auth.uid() = (SELECT patient_user_id FROM patients WHERE id = patient_id)` → source='patient'
  - `auth.uid() = doctor_id` (existing) → source='doctor'
  - `EXISTS hospital_members for auth.uid() in hospital_provider_id` → source='hospital'
- Extend `can_edit_admission` / `can_access_admission` helpers to include hospital staff for their provider's admissions.
- UI:
  - Patient: new "Hospital admissions" section in `My Holarchive` with list + "+ Log admission" dialog (self-service mode of `AdmissionsView`).
  - Hospital provider portal (`ProviderDashboard`): new "Admissions" tab — list admissions for this hospital, "+ Add admission" dialog requiring patient lookup (by username/email/ID number) and admission details.
  - Doctor flow: unchanged.
- Source badge on every admission card so viewers see who logged it.

## Files

**Migrations**
- New tables: `patient_profile_shares`, `approved_daily_medications`; helper fn `has_profile_share`.
- Alter: `patients` (+emergency contact columns/jsonb + share flags), `prescriptions` (+reminder_times, with_food, refill_reminder_days, source, approved_medication_id), `hospital_admissions` (doctor_id nullable, +created_by, +source, +hospital_provider_id).
- Updated SELECT RLS on `patients`, `prescriptions`, `medication_adherence`, `hospital_admissions`, `health_photos`, `holarchelp_incidents`.
- Updated INSERT/UPDATE RLS on `hospital_admissions`.

**Edge functions (new)**
- `send-medication-reminders` (cron)
- `share-incident-with-contacts`

**Front-end**
- `PatientDetailsEditor`, `MyDetails`: NOK section gains share toggles; new Emergency Contacts section; new "Who can see my profile", "My daily medications", "Hospital admissions" sections.
- New `src/pages/patient/SharedProfile.tsx` + route + sidebar item.
- `TodaysMedicationsCard`, prescription editor — reminder fields + clearer state.
- SOS flow in `HolarcHelpHome` — recipient preview (Emergency Contact default) + post-create call to `share-incident-with-contacts`.
- `ProviderDashboard` — new Admissions tab + create dialog.

**Cron**
- `pg_cron` schedule for `send-medication-reminders` every 5 minutes via insert tool.

**Memory**
- New entries: `features/profile-sharing`, `features/medication-reminders`, `features/sos-live-tracking-share` (Emergency Contact default), `features/patient-self-medications`, `features/admissions-multi-source`, `features/emergency-contact-vs-nok`.
