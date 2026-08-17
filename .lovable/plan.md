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

Each contact gets a checkbox group, "What <name> can see", replacing the current profile/live-tracking switches. Logical order:

1. SOS alerts
2. SOS live tracking
3. Medical information
4. Medication
5. Chronic medication
6. Hospital admissions (without medical information)
7. Hospital admissions (with medical information)
8. My lab results
9. My sessions
10. My documents
11. My calendar
12. My tasks
12. My Biolog
13. My Round Table

Notes: checking "Hospital admissions (with medical information)" implies the "without" level; nothing is checked by default except SOS/live tracking so sharing stays opt-in.

## 5. Patient dashboard

- Panel **My Care Circle** → **My Holarc Medical Team** (still opens the doctors screen).
- A new **My Holarc Care Team** panel directly underneath, listing care team members with a link into the Care Team section of the profile.

## Technical notes

- Care team members remain rows in `patients.emergency_contacts` (JSONB). Each row gains a `permissions: string[]` field; existing `can_view_profile` / `can_view_live_tracking` values are mapped into it on read so saved contacts keep working.
- The checkbox list is defined once (id + label + order) in a shared constants module and consumed by the inline section, the new sub-tab and any future access checks.
- This change records consent choices in the profile; enforcing each permission across every screen is separate follow-up work and is not part of this change.
- Files touched: `PatientDetailsEditor.tsx`, `EmergencyContactsInline.tsx`, `EmergencyContactsSection.tsx`, `MyPersonalDashboard.tsx`, sidebar/bottom nav, `src/features/ask-maeve/*` display strings, locale JSON files, assistant edge functions.
