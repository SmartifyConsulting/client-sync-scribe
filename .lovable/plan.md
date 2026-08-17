# Email polish + doctor "My Holarchy" menu and profile toggle

## 1. Emails: logo actually renders

The branded email shell points at `https://holarchealth.com/...logo.png`, which answers with a 302 redirect to the `www.` host. Most mail clients (Gmail/Outlook image proxies) do not follow redirects, so the logo shows as broken alt text — exactly what your screenshot shows.

- Point the email logo at the final `https://www.holarchealth.com/...` URL (no redirect).
- Add explicit `width`/`height` attributes and a text fallback so blocked-image clients still show "Holarc Health" in brand teal.

## 2. Link back to the document in the app

Every document email gains a clear call to action under the body:

- A branded button: "View this document in Holarc Health".
- Doctors/staff link to `/documents?doc=<id>`, patients to `/patient/documents?doc=<id>`; the documents screens will open the matching document automatically when that parameter is present.
- Plain-text URL shown beneath the button for clients that strip buttons.

## 3. No more "Dear Colleague"

- Referral letters and any generated letter greet the actual recipient: "Dear Dr <Surname>" for practitioners, "Dear <First name>" for patients/other recipients.
- Falls back to the practice or organisation name when no person name is known; never a generic "Dear Colleague".

## 4. Doctor's signature in the email footer

- The doctor's configured signature (uploaded image or typed signature font) is rendered in the footer block: below the grey divider line, directly above the "Sent by Dr Georgia Adams · ..." line.
- Practice name, qualification and practice number stay under the signature as they are today.

## 5. Resend the test emails

After the above, re-send one test of each document type (Consultation Note, Medical Certificate, Referral Letter, Prescription, Invoice) to georgia.adams@smartify.co.za with the same sample data so you can check the logo, link, greeting and signature.

## 6. Doctor "My Holarchy" menu parity

The doctor's My Holarchy group currently has only Dashboard, Profile, Biolog, Rewards. It will match the patient menu:

```text
My Holarchy
  My Dashboard
  My Profile
  My Biolog        (locked unless v2)
  My Admissions
  My Calendar
  My Tasks
  My Rewards
  Ask Holarc       (locked unless v2)
  SOS
```

- The personal items point at the patient routes (`/patient/admissions`, `/patient/calendar`, `/patient/tasks`, `/patient/rewards`).
- The practice items (My Practice, My Shifts, practice Calendar, practice Tasks) stay unchanged under My Holarprac, so there is no confusion between practice and personal views.
- SOS remains visible in both the doctor menu and the patient menu.

## 7. Doctor / Patient toggle badge next to Dashboard

- A small pill badge sits next to the Dashboard item at the top of the sidebar with two segments: Doctor | Patient.
- Doctor shows the practice menu (Holarprac + My Patients + Holarchy), Patient switches the sidebar to the patient menu and navigates to `/my-dashboard`.
- The toggle reflects the current route automatically and persists the last choice, so a refresh keeps you where you were.
- SOS stays present in both modes.

## Technical notes

- `supabase/functions/_shared/brandEmail.ts`: non-redirecting logo URL, new optional `documentUrl` and `signatureHtml` options rendered in the body CTA and footer respectively.
- `supabase/functions/send-document-email/index.ts`: loads the sender's signature fields from `profiles`, resolves the recipient's display name, builds the app deep link, passes all three into the shell. Redeploy after edit.
- Shared signature markup reuses the same rules as `src/lib/signature.ts` (image first, typed fallback) so email and PDF match.
- Greeting logic centralised in a small helper used by `useSessions.ts` referral generation and `ReferralLetterEditor.tsx`.
- Sidebar changes are confined to `src/components/layout/Sidebar.tsx` (section definitions + new toggle component) and mirrored in `BottomNav.tsx` for mobile.
