# Fix Okoli session visibility and patient detail saving

## Confirmed current state
- Samuel Okoli’s phone-login account is linked to one active patient record containing five completed sessions; the latest session has a full transcript.
- The self-service patient profile’s **My Sessions** tab currently passes a hardcoded empty array to the session table, so it cannot display stored sessions.
- The patient editor includes `allergies_structured` in every autosave payload, but that field is absent from the live `patients` table. This directly causes the repeated schema-cache errors in the screenshot.
- The existing access rules allow Okoli to read sessions linked to his own patient record, and Dr Dean Allie has active session-summary access.

## Implementation
1. Add the missing structured-allergies field to the patient record schema as nullable structured data, preserving the existing plain-text allergies field for compatibility.
2. Update the generated backend types after the migration so structured allergies are typed consistently rather than cast through `any`.
3. Replace the hardcoded empty session list in the self-service patient profile with a real query for the resolved patient record ID, including loading, empty, and query-error states.
4. Reuse the same patient-to-session resolution for the standalone **Sessions** page so phone-login patients see sessions attached to their patient record, while doctors retain their own/all filtering.
5. Keep all stored sessions visible in the general session list; only use transcript-specific filtering where the UI explicitly represents recorded/transcribed sessions.

## Verification
- Sign in through Okoli’s phone account and confirm all five stored sessions appear under **Sessions**, including the latest session with its transcript.
- Open Okoli from Dr Dean Allie’s patient list and confirm the permitted session history appears there as well.
- Edit several patient fields and a structured allergy, wait for autosave, and confirm one successful save with no repeated error notifications.
- Reload the profile and verify the saved details and allergy data persist.
- Run the backend security linter and focused frontend checks for the affected profile/session flows.