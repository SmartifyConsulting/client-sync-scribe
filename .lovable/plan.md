

# Search-First Add Flow & Alphabet Filter Fix

## Overview

Three areas of change: (1) Referral Doctors page gets search-first with invite fallback, (2) Patients page Add Patient dialog gets invite fallback when not found, (3) Patient Invite Doctor dialog gets email invite fallback. All three retain a "manual add" fallback. Additionally, the alphabet filter on Patients is fixed to show only the selected letter's records.

## 1. Referral Doctors — Search-First with Invite & Manual Fallback

**File: `src/pages/ReferralDoctors.tsx`**

Replace the current "Add Doctor" form with a two-step flow:

- **Step 1 (Search)**: When clicking "Add Doctor", show a search input that queries `profiles` filtered to doctor-role users (same pattern as `InviteDoctorDialog`). Display suggestions with name, specialty, practice number.
- **Step 2a (Found)**: Selecting a suggestion auto-fills the form fields (first_name, last_name from full_name split; specialty, practice_number, etc. from profile). Save creates the referral_doctors record pre-populated.
- **Step 2b (Not Found → Invite)**: Show "Doctor not on Holarc? Send an invitation" with an email input. Calls `send-user-invitation` edge function with a message like "Dr. X has invited you to join Holarc Health for referrals."
- **Step 2c (Manual Fallback)**: A "Add manually" link below search reveals the existing form fields for manual entry.

## 2. Patients Page — Add Invite Fallback When Patient Not Found

**File: `src/pages/Patients.tsx`**

The Add Patient dialog already searches existing patient-role users. Add:

- When search yields no results after typing 3+ characters, show: "Patient not found on Holarc? Send an invitation" with an email input field and a "Send Invite" button that calls `send-patient-invitation`.
- Keep the existing manual form fields always visible below (they serve as the manual fallback).

## 3. Patient Invite Doctor — Email Invite Fallback

**File: `src/components/patient/InviteDoctorDialog.tsx`**

The dialog already searches for doctors. Add:

- When `nameSearch` has 3+ characters and `suggestions` is empty and `searchingDoctors` is false, show: "Doctor not on Holarc? Send an invitation via email" with an email input and send button.
- Call `send-user-invitation` with `recipientEmail` and message "Patient X has invited you to join Holarc Health."

## 4. Alphabet Filter — Show Only Selected Letter

**File: `src/pages/Patients.tsx`** (lines 700-960)

Currently clicking a letter scrolls to it but shows all groups. Change:

- When `selectedLetter` is set, filter the rendered groups to only show that letter. The ME record always shows.
- Allow clicking the same letter again to deselect (show all).
- Stretch the alphabet bar to full width: change buttons from `w-7` to `flex-1` and the container from `flex gap-0.5` to `flex w-full gap-0.5`.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/ReferralDoctors.tsx` | Search-first flow with profile search, invite fallback, manual fallback |
| `src/pages/Patients.tsx` | Add invite fallback in Add Patient dialog; fix alphabet filter to show only selected letter; stretch alphabet bar |
| `src/components/patient/InviteDoctorDialog.tsx` | Add email invite fallback when doctor not found |

