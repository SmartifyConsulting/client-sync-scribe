# Wealth Manager logos, New Client invite link, and style follow-up

## 1. LOA always uses the Wealth Manager's own profile
- Every client's Letter of Authority and Disclosure Agreement fill in from the profile of the Wealth Manager who invited them: planner details, FSP, compliance, suppliers, remuneration and logos.
- The footer line that is currently fixed to Masthead will also come from the profile. Masthead stays as the fallback only.
- If the profile is missing fields the letter needs, the Wealth Manager sees a "Complete your profile" warning before sending an invite.

## 2. Two logos per Wealth Manager
- Two uploads on My Business → Firm Information:
  - **FSP logo**, for the licensed provider they work under (e.g. Masthead).
  - **Business logo**, for their own practice (e.g. Elysian).
- PNG, JPG or SVG, up to 2MB each, with a preview, Replace and Remove.
- Documents show the business logo top left and the FSP logo top right in the letter header, also shown neatly in the Working Window.

## 3. New Client button and invite link
- A **New Client** button on My Clients and the Wealth Manager dashboard.
- The form asks for first name, surname, cell number and email (optional).
- Saving creates the Client ID (a client record linked to that Wealth Manager) and a new workflow at Step 1. It also creates a one-off secure link that expires after 14 days.
- Send options:
  - **WhatsApp**: opens WhatsApp with a ready message and the link.
  - **Email**: sends the link through the app's existing email service.
  - **Copy link**.
- Invites show as Invited, Signed up or Expired, with Resend and Cancel.

## 4. Client sign-up lands on Step 1
- The link opens a sign-up page branded with the Wealth Manager's logos, with name, cell and email already filled in.
- After signing up (or signing in, if they already have an account), the client is linked to their Client ID. They go straight to Live Workspace, Step 1, on the KYC, AML and PEP Screening step.
- Opening the link marks the secure-link step complete automatically.

## 5. Style follow-up (approved)
- Change about 290 one-off text sizes to the shared scale.
- Use one card rounding everywhere.
- Remove the old greens on 12 screens.
- Move the remaining screens onto the shared page heading and frame.
- Then check every client and Wealth Manager screen at desktop and phone size, with screenshots, and report anything still out of line.

## Technical details
- Migration: add `business_logo_path` and `fsp_logo_path` to `wealth_practice_info`. Add a new `wealth_client_invites` table (token hash, patient_id, workflow_id, owner_user_id, contact, status, expires_at, accepted_by), with grants and RLS so only the owner and admins can read or write.
- Private storage bucket `practice-logos`. Owners write to their own folder, signed-in users can read, and a signed URL is used for the documents.
- Edge function `wealth-create-invite`: creates the patients row, the workflow and the token, and returns the URL `https://holarc.co.za/join/<token>`. The email goes out through the existing send-user-invitation function.
- Edge function `wealth-accept-invite`: checks the token server-side, sets `patients.patient_user_id`, assigns the client role, marks step 1.1 complete through a wealth_* DB function, and expires the token.
- New `/join/:token` route. It shows the branded invite preview, then the sign-up form with the eye toggle and the Forgot Password link (tab order respected), then redirects to `/my-workspace`.
- `loaHtml`/`disclosureHtml` take logo URLs and footer fields from the workflow owner's practice info.
- Record in AGENTS.md: clients join only via an owner-generated invite token.
