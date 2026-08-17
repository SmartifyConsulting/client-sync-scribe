# Rename to "Ask Holarc" + My Holarchy / Care Team restructure

## 1. Ask Holarc rename (user-facing only)

Every visible mention of Maeve, Michael or Angel becomes **Ask Holarc** (the assistant is referred to as "Holarc" in conversation).

- Sidebar and bottom navigation labels.
- Ask assistant home, chat, recap, session title, voice picker and PDF/transcript exports (headings, greetings, disclaimers, empty states, toasts).
- Patient dashboard wellbeing card ("Ask Angel" button and supporting copy).
- Translation entries in `src/i18n/locales/*.json`.
- Assistant system prompt / spoken name in the chat and speech edge functions, including the phonetic pronunciation hack ("Meev") which is removed — "Holarc" is spoken as written.

Internal identifiers stay as-is (folder `src/features/ask-maeve`, hooks, table names, route `/ask-maeve`) so nothing breaks; only displayed text changes.

## 2. Patient profile tab renames

In the patient profile (`PatientDetailsEditor`, both view and edit modes):

- Top-level tab **My Care Circle** → **My Holarchy**.
- Sub-tab **My Holarc Team** → **My Holarc Medical Team** (heading and helper text: practitioners only).
- New sub-tab **My Holarc Care Team**, placed after the Medical Team and before Insurance.

```text
My Holarchy
  My Holarc Medical Team | My Holarc Care Team | Insurance | Pharmacies | Hospitals
```

## 3. Personal Information: Emergency Contacts → My Holarc Care Team

The Emergency Contacts section on Personal Information is renamed **My Holarc Care Team** and reused (same stored data) by the new My Holarchy sub-tab, so both places edit one list.

Explanatory copy: "Your Holarc Care Team is the friends and family you choose to share parts of your profile with. They are also the people notified when you trigger an SOS. Your Holarc Medical Team is your medical practitioners."

Behaviour changes:
- Remove the "Same as Next of Kin" toggle.
- When the care team list is empty, your Next of Kin is listed automatically as the first care team member. It can be edited, kept or deleted like any other contact.

## 4. Access checkboxes per care team member

Each contact gets a checkbox group, "What <name> Can See", replacing the current profile/live-tracking switches. All checkbox labels are Title Case. Logical order:

1. SOS Alerts
2. SOS Live Tracking
3. Medical Information
4. All Medication
5. Chronic Medication
6. Hospital Admissions (Without Medical Information)
7. Hospital Admissions (With Medical Information)
8. My Lab Results
9. My Sessions
10. My Documents
11. My Calendar
12. My Tasks
13. My Biolog
14. My Round Table

Notes: checking "Hospital Admissions (With Medical Information)" implies the "Without" level; nothing is checked by default except SOS Alerts and SOS Live Tracking so sharing stays opt-in.

## 5. Patient dashboard

- Panel **My Care Circle** → **My Holarc Medical Team** (still opens the doctors screen).
- A new **My Holarc Care Team** panel directly underneath, listing care team members with a link into the Care Team section of the profile.

## Technical notes

- Care team members remain rows in `patients.emergency_contacts` (JSONB). Each row gains a `permissions: string[]` field; existing `can_view_profile` / `can_view_live_tracking` values are mapped into it on read so saved contacts keep working.
- The checkbox list is defined once (id + label + order) in a shared constants module and consumed by the inline section, the new sub-tab and any future access checks.
- This change records consent choices in the profile; enforcing each permission across every screen is separate follow-up work and is not part of this change.
- Files touched: `PatientDetailsEditor.tsx`, `EmergencyContactsInline.tsx`, `EmergencyContactsSection.tsx`, `MyPersonalDashboard.tsx`, sidebar/bottom nav, `src/features/ask-maeve/*` display strings, locale JSON files, assistant edge functions.
