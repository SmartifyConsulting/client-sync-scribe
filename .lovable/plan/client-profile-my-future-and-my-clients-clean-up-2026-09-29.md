# Client profile, My Future and My Clients clean-up

## 1. My Clients (Wealth Manager)
- The red count circle and the A–Z letter strip change to #3AD0C4 (a new teal colour setting, not hardcoded).

## 2. My Profile (client)
- Header copy becomes investment-focused: "My Profile — Your personal and financial details, advisers and consultation history."
- Tabs are cleaned up:
  - The "My Holarchy" tab becomes **My Advisors**: a dated history of every broker or Wealth Manager who has served the client, marking who is current and who is past, with start and end dates taken from access history.
  - "My Sessions" becomes **My Consults**.
  - Lab Results and Round Table are removed from the client tabs and menus. The dashboard's "Lab Results" quick link is removed too. The code stays hidden, not deleted.
  - The Documents tab moves out of My Profile.

## 3. Overview: AI Summary at the top
- A new **AI Summary** frame sits at the top of the client Overview, on both the client's and the Wealth Manager's view.
- It combines the summaries of all past consultations with life events (marriage, birth, new job, property, claims, beneficiary changes, policy issued).
- It rebuilds automatically after each consultation ends, and whenever a life event, claim or policy change is saved. It is also shown with a "last updated" time and a manual refresh button.
- It uses Lovable AI and is marked as advisory only.

## 4. My Future
- Uses the same tab style as My Profile: a solid blue tab bar with white tabs when active.
- Tabs: My Cover, My Investments, Retirement, Claims, **Documents**. The Documents tab now holds the client's full document list that used to live in My Profile.
- Bug: clicking My Future jumps back to My Profile. First confirm the cause (likely the client-route guard or the menu's section-based active logic redirecting to /patient/details), then fix it so /my-future stays put on the desktop and mobile menus.

## 5. Booking an appointment (calendar wizard)
- "Select a Doctor" becomes "Select your Wealth Manager". All other medical wording in the wizard is replaced (reasons, practice → firm, specialty → focus area). Meeting types become: Initial consultation, Annual review, Portfolio review, Claim support, Other.

## Technical details
- `--brand-teal: #3AD0C4` token in index.css and Tailwind, applied in `Patients.tsx` (letter strip and count badge).
- `PatientDetailsEditor.tsx`: rename tab labels; remove `labresults` and `roundtable` from the client `SECTION_TABS`; move `documents` out. Overview "My Advisors" reads `doctor_patient_access` (granted/revoked dates) plus profiles.
- Life events: a new `client_life_events` table (patient_id, event_type, event_date, notes, created_by), with RLS via `can_view_patient_record` and grants. It also adds an `ai_summary` + `ai_summary_updated_at` on `client_financial_profiles`.
- A new edge function `client-ai-summary` (Gemini flash) compiles `sessions.summary`, life events, claims and applications. It is triggered from the client after a consultation is saved, after a life event is added, and by the refresh button. The Overview frame reads the stored summary.
- `MyFuture.tsx`: reuse the same `TabsList`/`TabsTrigger` classes; the Documents tab embeds the existing patient documents component.
- Investigate `App.tsx` WealthRouteGuard, `Sidebar.tsx` and `PatientAppLayout` for the redirect before editing.
- `BookAppointmentDialog.tsx`: copy changes only.
