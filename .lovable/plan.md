## Translation Sweep — Round 4 (expanded)

Combines the earlier Round 4 scope (calendar dates, accordion titles, every field label) with the new untranslated surfaces shown in the screenshots.

### A. Calendar localization
- Month name in header ("June 2026") and weekday short labels (Mon–Sun) driven by localized tables for all 25 languages, plus `date-fns` locale wiring where upstream supports it.
- "Today" pill, week-range chips, "All day", empty-state strings.

### B. Patient Profile accordions
- Translate every `<SectionHeader>` title (Personal Details, Next of Kin, Employer, General Information, Allergies/Medication/Conditions, Daily Vitamins, Surgeries, General Practitioner, Pharmacies — ~18 call sites).
- Translate every inner `<Label>` (~50 fields: First/Surname, Preferred Name, Title, ID, DOB, Gender, Marital Status, Languages, Mobile, Email, Home/Postal Address, Relationship, Employer, Occupation, Medical Scheme/Plan/Member No./Dependant Code, Allergen, Reaction, Severity, Condition, Onset, Status, Medicine, Dose, Frequency, Route, Start/End, Surgery, Date, Surgeon, Hospital, GP Name/Practice/Phone/Email, Pharmacy Name/Phone/Address) and inline Add/Remove buttons.

### C. My Practice accordions
- Section titles: About Me, Practice Information, Letterhead/Branding, Banking Details, Partners, Calendar Sharing.
- Field labels: Practice Name, Practice No., HPCSA/MDCN/MCAZ No., Tax/VAT No., Specialty, Sub-specialty, Languages, Phone, Email, Website, Physical/Postal Address, Bank Name, Account Holder/Number/Branch/Type/SWIFT.

### D. NEW — Patients list page (screenshots 1, 4, 5)
- Subtitle: "Manage your patient profiles and history".
- Page action buttons in `Patients.tsx` header: **Round Tables**, **All Sessions**, **Import**, **+ Patient**, **Filter**.
- Patient table column headers: **Patient**, **Contact**, **Last Seen**, **Since**, **Actions**.
- Row action menu items: **Start Session**, **View Profile**, **Delete Patient**.
- Inline icon tooltips on each row: **Preview**, **Send**, **Edit**, **Delete**.

### E. NEW — To-Do AI-suggested tasks (screenshot 2)
- Localize the AI task scaffolds emitted into the To-Do list. Verbs `Review`, `Schedule`, `Send`, and the document nouns `Invoice`, `Prescription`, `Letter of recommendation`, `Appointment`, `Follow-up` rendered through `t()` so output reads e.g. "Réviser la facture — Sharon Kennedy" / "Überprüfen Rechnung — …" depending on language.
- Implementation: replace stored English action verbs with structured keys `{ verb: "review", noun: "invoice", subject: "Sharon Kennedy" }`. The renderer composes `${t('todo.verbs.' + verb)} ${t('todo.nouns.' + noun)} — ${subject}`. Subjects (names, dates) stay verbatim. Legacy free-text tasks fall back to original string.

### F. NEW — Recent Activity card (screenshot 3)
- Relative-time strings ("2 hours ago", "Yesterday", "5 mins ago", "just now") wired through `date-fns/formatDistanceToNow` with the localized `date-fns` locale resolved in §A.
- Activity verbs ("Session completed", "Document created", "Task completed", "Follow-up sent") already translated; verify and patch any English residuals (e.g. nested item subtitle "Review financial documents" is user data and stays as-is).

### G. NEW — AI Summary surfaces (screenshots 8, 9, 10)
- Loading text "Generating AI summary of patient history…" → `t('patientProfile.aiSummaryGenerating')`.
- AI Patient Summary card: title **AI Patient Summary**, subtitle **Summarized from all session transcriptions and history**, section labels **SUMMARY**, **TIMELINE**, **Refresh** button, **N event(s)** chip (pluralised via i18next interpolation).
- Auto-generated summary body itself is dynamic AI output; out of scope (user data).

### H. Locale file updates
Add the following namespaces/keys to `en.json` and translate to all 24 other locales via the Gemini batch script:
- `calendar.months.*`, `calendar.weekdaysShort.*`, `calendar.today`, `calendar.allDay`.
- `patientProfile.section*` and `patientProfile.field*` (~60 keys).
- `myPractice.section*` and `myPractice.field*` (~30 keys).
- `patients.subtitle`, `patients.col*`, `patients.action*`, `patients.tooltip*`, plus header buttons (`roundTables`, `allSessions`, `import`, `addPatient`, `filter`).
- `todo.verbs.{review,schedule,send,sign,follow_up,call,email}` and `todo.nouns.{invoice,prescription,letter,appointment,report,referral,result}`.
- `recentActivity.{justNow,minsAgo,hoursAgo,yesterday,daysAgo,weeksAgo}` (using i18next plural/interpolation).
- `aiSummary.{generating,title,subtitle,summary,timeline,refresh,eventCount}`.

### I. Verification
- `tsgo --noEmit`.
- Playwright switch to Zulu, Hausa, French, Greek and capture: Calendar header + weekdays, Patient Profile (Personal + Medical), Patients list (header buttons, columns, row menu, tooltips), Recent Activity, AI Summary loading + loaded.

### Out of scope
- User-entered values (patient names, addresses, free-text notes, AI-generated summary bodies, individual task subjects).
- Doctor Sessions / Round Tables / Admin — already translated in earlier rounds.
