# Restore Permission Selection on Invites Page

## Problem

The Invites page currently hardcodes all four permissions (patient_info, calendar, session_summaries, prescription_history) when a patient accepts an incoming doctor invitation. There's no UI for the patient to choose which permissions to grant. The permission checkboxes that exist in the Invite Doctor dialog need to also appear on the Invites page.

## Changes

### 1. Add Permission Selection for Incoming Invitations

Update `src/pages/patient/PatientAccessManagement.tsx` to:

- Show the same 4 permission checkboxes (Patient Information, Calendar, Session Summaries, Prescription History) for each pending incoming invitation plus an additional permission checkbox for "Doctor Round Table Discussions" access.
- Track selected permissions per invitation using state
- When the patient clicks "Accept", use their selected permissions instead of hardcoding all four
  &nbsp;

### 2. Show Granted Permissions on Approved Invitations

For the approved outgoing invitations section, show which permissions were granted (read from `doctor_patient_access` table) as badges, so the patient can see what access each doctor has.

## Technical Details

### `src/pages/patient/PatientAccessManagement.tsx`

- Add state: `permissionsPerInvitation` as `Record<string, AccessPermission[]>` to track permission selections per incoming invitation
- Initialize each invitation with all 4 permissions selected by default
- Add checkbox UI (same pattern as InviteDoctorDialog) below each pending invitation card
- On accept, pass `permissionsPerInvitation[invitationId]` to the `doctor_patient_access` insert instead of the hardcoded array
- Validate at least one permission is selected before accepting
- For approved invites section, also fetch the `doctor_patient_access` records to show which permissions were granted