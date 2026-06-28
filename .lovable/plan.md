## Translation Sweep — Round 3

Round 2 wired the high-level chrome, but several strings nested inside cards, list rows, template tiles, calendar header, **and every Patient Detail subform** are still hard-coded English. This round closes those gaps across the same 25 locales.

### Strings to translate (grouped by screen)

**My Practice (image-116)**
- Top pill tabs: `My Practice`, `Referrals`, `Credentials`, `My Rewards`
- "About Me" helper + `/ 600 words` counter

**Patient Rewards (image-117)**
- `Vulas to "{milestone}"`, `No rewards yet. Start your health journey!`

**To-Do List (image-121)**
- `Add New Task`, `Tap to record`, `Or type your task here…`, `Add`, `Priority:`, `Low/Medium/High`, `AI Process`
- Tab counts `Active (n) / Completed (n) / All (n)`
- Date group headers via `date-fns` locale map
- `Approve`, `AI` pill
- Template task verbs from `generateTaskTitle.ts` only

**Documents / Templates (image-122, image-120)**
- Helper text, `+ New Content Template`, `Create Template`
- Default template display labels + descriptions (Referral Letter, General Letterhead, Prescription, Medical Certificate, Invoice, Hospital Admission Form)
- `Letterhead: {Header and Footer | Default}`
- `Patient Documents`, `Search documents…`
- Document-type chips

**Patient card meta (image-119)**
- `{n} notes · Last activity {date}` via `t()` + `date-fns`

**SOS landing (image-123 residual)**
- `Help will be alerted instantly`, `Tapping SOS shares your location...`, `Manage emergency contacts`, `View incident history`

**My Calendar (image-124)**
- Subtitle `Manage your appointments and schedule`
- View toggles: `My Calendar`, `Practice Calendar`
- `Google Calendar`, `+ Book`, `Week / Month / Year`
- Month title (`LLLL yyyy`) + weekday short labels via `date-fns` locale
- Right rail: `Today's Schedule`, localized day-of-week date, `No appointments scheduled for today`

**Patient Detail screen — every tab and every subform (image-125) — NEW**

The patient profile is the biggest untranslated surface. Wire every label, helper, placeholder, accordion header, tab trigger, button, and empty state — across all tabs.

*Header strip*
- `Back to Patients`, `Schedule`

*Top tab triggers*
- `Details`, `Overview`, `Session History`, `Admissions`, `Healthcare Providers`, `Documents`, `Round Table`

*Details tab — section toggle*
- `Personal Information`, `Medical Information`, `Saved` indicator

*Personal Information subform*
- Section heading + helper `View and manage personal details`
- Accordion headers: `Personal Information`, `Addresses`, `Emergency Contacts`, `Next of Kin`, `Insurance / Medical Aid`, `Employer`, `Lifestyle`, `Consents`
- Field labels: `First Name(s)`, `Last Name`, `ID/Passport Number`, `Gender`, `Date of Birth`, `Email`, `Phone`, `Marital Status`, `Language`, `Referred By`
- Placeholders: `ID or passport number`, `Select status`, `Select language`, `Referral source`, `dd ---- yyyy` (use native date input — leave OS-controlled)
- Select option labels: gender values, marital status values, language values (use existing `lib/languages.ts` localized list)

*Medical Information subform*
- Section heading + helper
- Accordion headers: `Allergies`, `Chronic Conditions`, `Current Medication`, `Family History`, `Surgical History`, `Immunizations`, `Vitals`, `Lab Results`, `Genetic Markers`, `Lifestyle Factors`, `Mental Health`
- All field labels, placeholders, and empty states inside each accordion

*Overview tab*
- Section titles (Timeline, Recent Activity, Risk Badges), `No activity yet`, date stamps via `date-fns`

*Session History tab*
- Group headers `Today / Last Week / Last Month / Older`, `No sessions yet`, action buttons (`View`, `Resume`, `Notes`)

*Admissions tab*
- `New Admission`, column headers (`Hospital`, `Admitted`, `Discharged`, `Procedure Codes`, `Status`), empty state

*Healthcare Providers tab*
- `Invite Provider`, role chips (`GP`, `Specialist`, `Pharmacy`, `Insurer`), `No providers linked`

*Documents tab*
- Filter chips per document type, `Upload`, `Send`, empty state

*Round Table tab*
- `Start Round Table`, `Participants`, `Shared Notes`, empty state

### Files to touch

```text
src/i18n/locales/en.json                          (add new keys: patientDetail.*, calendar.*, etc.)
src/i18n/locales/{24 others}.json                 (batch via /tmp/i18n_extend3.py)

src/pages/MyPractice.tsx
src/pages/patient/MyRewards.tsx
src/pages/TodoList.tsx
src/components/todo/TaskDateGroup.tsx
src/lib/generateTaskTitle.ts
src/pages/Documents.tsx
src/components/documents/TemplateCard.tsx
src/lib/defaultTemplates.ts
src/components/documents/DocumentRow.tsx
src/components/patients/PatientCard.tsx
src/modules/holarchelp/pages/HolarcHelpHome.tsx
src/pages/CalendarView.tsx
src/components/calendar/MonthGrid.tsx
src/components/calendar/TodaysSchedule.tsx
src/lib/dateFnsLocale.ts                          (NEW: i18n.language → date-fns Locale)

# Patient Detail surface
src/pages/PatientDetail.tsx                       (header strip, top tabs)
src/components/patient-detail/DetailsTab.tsx      (Personal/Medical toggle, Saved badge)
src/components/patient-detail/PersonalInformationForm.tsx
src/components/patient-detail/MedicalInformationForm.tsx
src/components/patient-detail/sections/AddressesSection.tsx
src/components/patient-detail/sections/EmergencyContactsSection.tsx
src/components/patient-detail/sections/NextOfKinSection.tsx
src/components/patient-detail/sections/InsuranceSection.tsx
src/components/patient-detail/sections/EmployerSection.tsx
src/components/patient-detail/sections/LifestyleSection.tsx
src/components/patient-detail/sections/ConsentsSection.tsx
src/components/patient-detail/sections/AllergiesSection.tsx
src/components/patient-detail/sections/ChronicConditionsSection.tsx
src/components/patient-detail/sections/MedicationsSection.tsx
src/components/patient-detail/sections/FamilyHistorySection.tsx
src/components/patient-detail/sections/SurgicalHistorySection.tsx
src/components/patient-detail/sections/ImmunizationsSection.tsx
src/components/patient-detail/sections/VitalsSection.tsx
src/components/patient-detail/sections/LabResultsSection.tsx
src/components/patient-detail/sections/GeneticMarkersSection.tsx
src/components/patient-detail/sections/MentalHealthSection.tsx
src/components/patient-detail/tabs/OverviewTab.tsx
src/components/patient-detail/tabs/SessionHistoryTab.tsx
src/components/patient-detail/tabs/AdmissionsTab.tsx
src/components/patient-detail/tabs/HealthcareProvidersTab.tsx
src/components/patient-detail/tabs/DocumentsTab.tsx
src/components/patient-detail/tabs/RoundTableTab.tsx
```

(Exact file names confirmed during build — folder layout may use slightly different naming; the audit will follow imports from `PatientDetail.tsx`.)

### Re-render

`key={i18n.language}` on `AppLayout` / `PatientAppLayout` from Round 2 already handles live language switching. Once wired to `t()` these surfaces flip together.

### Translation script

`/tmp/i18n_extend3.py` (clone of `extend2.py`) targets only newly added keys, fills the 24 non-English locales via Gemini in one batch. English values authored manually in `en.json`.

### Out of scope

Captured patient data (names, addresses, allergy text, doctor notes, transcripts) stays in its source language by design — only the chrome around it is translated.
