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

## Session Recording Restricted to Doctors
Checked current state: the recording screen at `/sessions` sits behind a sign-in-only guard with no role requirement, and the database insert rule for sessions allows any signed-in user to create a session for themselves. A patient is therefore not currently prevented from recording.

- Add a role guard to the recording route so patient-only accounts are redirected to their dashboard with a clear message rather than reaching the recorder.
- Confirm no patient-facing navigation, dashboard tile, or quick action links to the recording screen; patients keep read-only access to their own past sessions.
- Tighten the database rule so creating a session requires the doctor role, closing the direct-API path as well as the UI path.
- Keep dual-role accounts (a doctor who is also a patient) able to record while in Doctor mode.

## Verification
- Verify Doctor mode defaults to the doctor dashboard and Patient mode displays the charcoal **My Holarchy** heading with patient Dashboard selected.
- Verify the Family Doctor label in both display and edit modes.
- Deploy the updated email function, send a fresh test invoice to `georgia.adams@smartify.co.za`, and confirm the provider accepts it.
- Verify the generated email HTML contains the supplied logo URL and the invoice deep link; final inbox rendering and link opening can then be confirmed from the received email.
- Sign in as a patient-only account, open the recording screen directly, and confirm the redirect; confirm a patient-issued session creation is rejected; confirm a doctor can still start, record and finalise a session normally.

## Technical Notes
- The current sidebar stores the selected profile mode in local storage, which can reopen a doctor in Patient mode; the default-state handling will be adjusted so Doctor mode is authoritative on initial doctor entry.
- The invoice email calls currently provide rendered HTML but no `documentId`; as a result, the shared email shell receives a null document URL and omits the link. The patient Documents page already resolves invoice IDs from `?doc=<invoice-id>`.