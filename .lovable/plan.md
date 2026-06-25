## Fixes & enhancements — batched plan (revised)

### 1. Stay Alive Hospital shows doctor profile instead of hospital profile
- Investigate `HolarcHelpProviders` / hospital detail route: when the org type is "hospital", the page is currently resolving the owner_id's `profiles` row (doctor profile) instead of the `holarchelp_hospitals` row.
- Fix the route loader/component to fetch from `holarchelp_hospitals` by id and render a dedicated Hospital profile (logo, address, admin contact, license, services, affiliated doctors list).

### 2. "Other" Vula award → admin notification only
- In the doctor award-Vulas flow, when the doctor picks **Other** and types a custom reward reason/amount, do NOT write that as a new entry in `vula_adherence_configs` or treat it as an approved category.
- Instead: insert a `notifications` row targeted at platform admins (`role = 'admin'`) containing the suggested reward text, doctor id, and patient id, so an admin can review and (optionally) promote it to a standard reward.
- Standard (non-"Other") awards continue to work unchanged.

### 3. AI Clinician sequencing + narration + signatures
- **Sequence**: Move the "Generate AI Clinician recommendation" button from the post-prescription step to immediately after the session summary is produced (before prescription/medical certificate). Reorder buttons in `SessionDetail.tsx`.
- **Narration failure**: Debug the `narrate-ai-summary` invocation (likely auth header / language param). Add error toast and fallback to browser TTS.
- **Signature in docs**: Auto-inject the doctor's saved signature into Prescription, Medical Certificate, Referral, and General Letter editors (read from `profiles.signature_url` and render in preview + export).

### 4. Default templates AND default header/footer templates for every doctor (sanitised)
- Take Georgia's current 6 document templates **plus her header/footer template(s)** as the canonical defaults.
- Scrub all real practice/patient data — replace names, addresses, phone, email, logo, registration numbers with "Sample data" / lorem ipsum placeholders. Use a neutral placeholder logo.
- Store as seed rows in a `default_templates` + `default_header_footer_templates` table (or as constants in `src/features/documents/templates/defaults.ts`).
- On doctor signup (or first login if missing), bulk-insert both sets so every new doctor starts with a working letterhead + the 6 document templates pre-wired to that letterhead.

### 5. Country-code persistence + Nigeria in practice setup
- Audit every phone field (Practice setup, Profile, Invitations, Hospital, Insurance, Pharmacy) to use the shared `PhoneNumberInput` instead of plain inputs.
- Ensure the country code chosen at signup is written to `profiles.country_code` and pre-selected everywhere.
- Confirm Nigeria (+234) appears in all dropdowns (bug is that some forms bypass the shared component).

### 6. Drag-and-drop placeholders into templates
- In `TemplateSectionEditor` (and header/footer editor), make placeholder chips `draggable`; add drop handler to the rich-text area that inserts the token at the cursor.

### 7. Remove "check your email" message after doctor signup
- Email confirmation is disabled — remove the post-signup toast/screen in `Auth.tsx` and route doctors straight into onboarding.

### 8. Notification bell count for doctor invites
- Notification bell badge currently filters out `type = 'doctor_access_request'`. Include all unread notification types in the count; ensure the realtime subscription refreshes the badge.

### 9. Nigerian languages + Naira
- Add `ig` Igbo, `ha` Hausa, `yo` Yoruba to `src/lib/languages.ts`.
- Add `NGN` Naira (₦) to currency list in billing/invoice config.

### 10. Hospital affiliations auto-list registered hospitals
- In the doctor "Add hospital affiliation" picker, query `holarchelp_hospitals` (status = approved) and show as a typeahead/select. Free-text entry only as fallback.

### 11. Session recording UI cleanup
- Label the Pause button "Pause recording" and Play button "Resume recording" (visible text + aria-label).
- Remove the duplicate "End session" button. Stopping the recording = ending the session and triggering the transcription/summary pipeline (single button).

### 12. Medical certificate end-date parsing
- Improve the AI extraction prompt to compute explicit end dates from phrases like "until Monday", "for 3 days", "back at work on the 5th". Inject current date + day-of-week into the prompt.

### 13. Referral letter improvements
- Convert "Referred to" field to a dropdown sourced from the doctor's `referral_doctors` table (search + "add new" fallback).
- Auto-populate the referral letter body with appointment date, session summary, key findings, current medications, and reason for referral — pulled from the current session record.

### 14. Date parsing fix ("3 July" heard as "2 July")
- Audit the date-extraction prompt used for appointment scheduling. Force ISO output, validate against the calendar, and add test cases for "3 July", "the third of July", "next Wednesday".

---

### Technical notes
- New DB work: `default_templates` + `default_header_footer_templates` seed (or code constant), `profiles.country_code` column if missing. No new table for admin Vula suggestions — reuse `notifications`.
- Edge functions to touch: `narrate-ai-summary`, date-parsing prompts in session post-processing.

### Out of scope
- Branded transactional emails — still blocked on custom domain decision.

Shall I build this in one pass, or split into phases?
