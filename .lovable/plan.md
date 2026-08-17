# Doctor/Patient Navigation and Invoice Email Fix

## Navigation
- Move **My Dashboard** into the **My Holarprac** section as its first item, directly above **My Practice**.
- Start doctor accounts in **Doctor** mode on the doctor dashboard, with the Doctor badge and Dashboard visibly selected.
- Remove the entire **My Holarchy** section and its patient-profile links from the Doctor-mode navigation.
- Keep the Doctor/Patient badge switcher available beside the dashboard area.
- When **Patient** is selected, navigate to the patient dashboard and render:
  1. A charcoal-black **My Holarchy** section heading.
  2. **My Dashboard** immediately below it as the selected item.
  3. The remaining patient-profile navigation items beneath it.
- Keep **SOS** available in both Doctor and Patient modes.
- Preserve active-route highlighting and ensure switching back to Doctor returns to the doctor dashboard.

## Medical Information
- Rename **General Practitioner** to **Family Doctor** in both the read-only and edit versions of the Medical Information section, including the associated field label.

## Email Branding and Invoice Link
- Add the newly supplied Holarc Health logo through the project asset flow and use its stable hosted URL in the shared email layout, replacing the current logo URL that recipients are not seeing.
- Retain accessible logo dimensions, alt text, and a text-brand fallback for email clients that block images.
- Pass the invoice ID when sending patient and paid-invoice emails so the shared email wrapper includes a visible **View this invoice in Holarc Health** button and plain-text fallback URL.
- Point that link to the patient Documents screen, where invoice IDs are already loaded and auto-opened in the document preview.
- Keep the PDF attachment, personalised greeting, doctor signature, and sender attribution intact.

## Consent-Gated Session Recording (Doctor or Patient)
Checked current state: the recording screen sits behind a sign-in-only guard with no consent step, and any signed-in user can create a session for themselves. There is no consent request, notification, or block on starting a recording today.

Either party may initiate a recording, but recording cannot start until the other party consents.

- **Initiate:** the initiator picks the other party and requests to record. The session is created in a "Awaiting consent" state with recording controls disabled and a clear on-screen explanation of the rule.
- **Consent request:** the other party receives an in-app notification (plus email) with the requester's name, date/time and purpose, and two clear actions: **Allow recording** or **Decline**.
- **Start gate:** recording controls only unlock once consent is granted. Attempting to start earlier shows a guiding message rather than a raw error.
- **Decline / timeout:** a decline closes the request with a polite explanation to the initiator and an option to continue the consultation without recording. An unanswered request expires after a set window with the same guidance.
- **Withdraw:** either party can stop the recording at any time; withdrawal ends capture immediately and is recorded on the session.
- **Audit:** who consented, when, and through which channel is stored on the session so it can be shown in the session record.
- **Guidance messages:** friendly, plain-language notices at each step — awaiting consent, consent granted, declined, expired, withdrawn, and "the other party is not on the app yet".
- **Party not on the app:** if the other party has no account, the flow switches to an invitation — a sign-up link sent by email or WhatsApp — and the recording stays blocked until they join and consent.
- Enforce the same rule server-side so recording cannot be started by bypassing the interface.


## Verification
- Verify Doctor mode defaults to the doctor dashboard and Patient mode displays the charcoal **My Holarchy** heading with patient Dashboard selected.
- Verify the Family Doctor label in both display and edit modes.
- Deploy the updated email function, send a fresh test invoice to `georgia.adams@smartify.co.za`, and confirm the provider accepts it.
- Verify the generated email HTML contains the supplied logo URL and the invoice deep link; final inbox rendering and link opening can then be confirmed from the received email.
- Confirm recording stays blocked until the other party consents, from both a doctor-initiated and a patient-initiated request, and that the consent notification arrives in-app and by email.
- Confirm decline, expiry and withdrawal each show the intended guidance message, and that a request to someone without an account produces an email/WhatsApp sign-up invitation instead.

## Technical Notes
- The current sidebar stores the selected profile mode in local storage, which can reopen a doctor in Patient mode; the default-state handling will be adjusted so Doctor mode is authoritative on initial doctor entry.
- The invoice email calls currently provide rendered HTML but no `documentId`; as a result, the shared email shell receives a null document URL and omits the link. The patient Documents page already resolves invoice IDs from `?doc=<invoice-id>`.