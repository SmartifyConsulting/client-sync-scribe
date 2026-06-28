# Plan — Translate Today's Briefing + 6 doctor screens

Extends the doctor-dashboard translation work to the rest of the primary doctor portal using the same `t()` + `uiTranslations.ts` pattern.

## Scope

**Translate** (labels, headings, buttons, tabs, menu items, placeholders, empty-states, toasts):

1. **Today's Briefing card** (image 1) — `BriefingCard` / `DashboardBriefing`: title "Today's Briefing", date, "X of Y appointments completed", **Narrate** button, arrow nav tooltips.
2. **My Patients** (`/patients`) — page title, search placeholder, "Add Patient", tab labels (All / Mine / Shared / Pending), accordion section headers, empty state, sort/filter controls, card action buttons.
3. **My Calendar** (`/calendar`) — view toggles (Day/Week/Month), "Today", "New Appointment", date-navigation arrows aria-labels, status filters, mini-legend, all-day label.
4. **My Sessions** (`/sessions`) — page title, "New Session", search placeholder, accordion group headers (Today / Last week / Last month / Older — from the prior plan), session-row action menu labels (Open, Edit, Delete, Mark Complete), empty state.
5. **My Round Tables** (`/round-tables`) — title, "New Topic", tab labels, member-presence labels, "Reply", composer placeholder, "Mark all read", notification labels.
6. **My Rewards** (`/doctor/rewards`) — title, KPI card titles (Vulas earned, Streak, Patients adhering), tab labels, redeem-button copy, empty state.
7. **SOS** — `LiveSOSScreen` + `DoctorSosChooser`: title, severity labels (Critical / High / Medium / Low), KPI cards (Active, Responding, Resolved), filter chips, "Assign", "Mark resolved", confirm-cancel dialog copy, voice-note CTA labels (the recorder UI itself).

**Not translated** (data, not chrome):
- AI-generated todo descriptions like *"Schedule appointment with Sarah Johnson on 2026-06-04…"* (image 2) — these come from `process-todo-actions` and remain in the source language. We'll add a separate follow-up to teach that edge function to honor the user's `preferred_language` for new tasks.
- Patient names, prescription text, transcripts, document contents.

## How the work is done

1. **Add namespaces** to every locale JSON in `src/i18n/locales/*.json`:
   - `briefing` — title, date format, completedCount, narrate, prev, next.
   - `patients` — page chrome only.
   - `calendar` — view names + controls.
   - `sessions` — page + accordion group labels.
   - `roundTables` — page + composer chrome.
   - `doctorRewards` — page + KPI chrome.
   - `sos` — page, severity, status, KPI chrome (without overwriting existing `sosVoice` / `voiceNotes` namespaces).
2. **Wire `useTranslation()`** in each screen's top component and replace hardcoded JSX text. Same pattern as `Dashboard.tsx` / `CompactTodoList.tsx`.
3. **Batch-translate** the new English keys into the other 24 locales using a one-shot Lovable AI call (Gemini 2.5 Flash) per locale, with a Python helper script (same approach used for `doctorDashboard`). Existing keys are left untouched.
4. **Verify** by switching the top-right language picker to French, Igbo, Zulu and Arabic and confirming:
   - Today's Briefing header, Narrate button, and arrow controls flip.
   - Each of the 6 screens' chrome flips while data inside cards remains in its source language.
   - RTL layout (Arabic) keeps icons mirrored correctly.

## Files expected to change (chrome-only edits)

- `src/components/dashboard/BriefingCard.tsx` (or equivalent — confirmed once exploration phase begins).
- `src/pages/Patients.tsx`
- `src/pages/CalendarView.tsx`
- `src/pages/Sessions.tsx`
- `src/pages/doctor/DoctorRoundTablesPage.tsx`
- `src/pages/doctor/DoctorRewards.tsx`
- `src/modules/holarchelp/pages/provider/LiveSOSScreen.tsx` + `src/modules/holarchelp/components/DoctorSosChooser.tsx`
- All 25 `src/i18n/locales/*.json` files (additive)

No backend, schema, or behavior changes — translation only.

## Out of scope (already on the master plan, not re-done here)

Practice partners overhaul, hospital admissions, chronic-meds emergency-contact, patient document AI uploads. Those stay in their own batches so each ships verifiable.

Approve and I'll execute end-to-end.