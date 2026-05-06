# Plan — 7 fixes

## 1. AI auto-determine credential stars

Today `search_providers` computes `stars` with a hard-coded heuristic (3 + specialty + practice/doctor numbers). Replace with an AI-derived score:

- Add `credential_score` (numeric, 1–5) and `credential_score_updated_at` to `profiles`, `holarchelp_hospitals`, `holarchelp_ambulance_providers` via migration.
- New edge function `score-credentials` calls Lovable AI (`google/gemini-2.5-flash`) with a structured-output prompt evaluating: license fields present/valid format, specialty, about_me richness, address completeness, accreditation/registration. Returns 1–5.
- Triggered on profile update (debounced via `pg_notify` or simple "stale if older than 30 days") and via a "Recalculate" button in the admin Provider tab.
- Update `search_providers` to read `coalesce(credential_score, 3)` instead of the heuristic. `MyDoctors` keeps rendering `stars`.

## 2. Legal contracts — duplicated numbering

`LegalDocLayout` renders the TOC with `<ol class="list-decimal list-inside">` while every `<h2>` already begins with "1.", "2."… → user sees "1. 1. Acceptance…".

Fix: change the TOC list to `list-none` (no auto numbering) and rely on the heading's own number. Apply to all six legal pages — no per-page edits required.

## 3. Live tracking link opens in old HolarcHelp app

Root cause in `share-incident-with-contacts/index.ts`:
```
const trackUrl = `${SUPABASE_URL.replace("supabase.co","lovable.app")}/track/${token}`;
```
This produces `https://<project-ref>.lovable.app/track/...` — a stale Supabase preview host that resolves to the legacy HolarcHelp deployment.

Fix:
- Add a `PUBLIC_APP_URL` env var (default `https://holarchealth.com`).
- Build `trackUrl` from that constant (fallback to request `Origin` header if unset).
- Audit all edge functions for the same `replace("supabase.co","lovable.app")` pattern and replace.
- Confirm `/track/:token` route still loads `PublicTrack` on the new domain (it does — already in `App.tsx`). Remove stale `holarchelp.app` references from `README.md`.
- Verify nothing else still points at the old app: grep `holarchelp.app`, `holarc-help`, deep links — none found in app code, but README references to be cleaned.

## 4. Notify connected doctors of patient incidents

Augment `dispatch-sos` edge function (called when SOS is created):
- After fanning offers to ambulance providers, query `doctor_patient_access` where `patient_user_id = incident.user_id AND is_active = true`.
- For each doctor, insert into `notifications` (service-role bypasses RLS):
  ```
  type='patient_incident', title='Patient SOS', description='<patient name> triggered an SOS', reference_id=incident.id, user_id=doctor_id
  ```
- Existing realtime notifications subscription will surface a toast/badge in the doctor app immediately.
- Clicking the notification routes to `/patient/<patient_user_id>/holarchelp/incident/<id>` (read-only doctor view) — add this route mapping to `App.tsx`.

## 5. "Legal Terms" menu item in avatar popover

In `TopBarIcons.tsx`, insert a new menu item directly above Share App:
```
<Link to="/legal"> <Scale className="h-3.5 w-3.5"/> Legal Terms </Link>
```
Create new page `src/pages/Legal.tsx` listing the agreements with short descriptions:
- Terms and Conditions
- Privacy Policy
- Healthcare Provider Agreement (BAA)
- Patient Consent and Authorization
- Cookie Policy

Use the existing `LegalDocLayout`-style card grid. Add `/legal` route to `App.tsx`.

## 6. Present-tense legal copy for signed-in users

`LegalDocLayout` accepts a `tense` already implicitly via raw children. Approach:
- Add a hook `useLegalTense()` returning `"signed"` when `supabase.auth.getUser()` resolves with a user.
- Pass that into `LegalDocLayout`; layout exposes a `<LegalTenseProvider>` context.
- Wrap key acceptance phrases in a small helper `<T future="you will be bound" present="you are bound" />` across the six legal pages. Specific replacements:
  - "By creating an account … you agree to be bound" → "you are bound"
  - "you will be required to" → "you are required to"
  - Acceptance banner at top swaps "By signing up you agree" → "You have agreed to these terms" with the user's signup date when available.
- No content rewrite — only the verb forms in acceptance/binding clauses.

## 7. Merge Intellectual Property into Terms & Conditions

- Append the full IP content as a new top-level section "Intellectual Property" inside `TermsAndConditions.tsx` (renumbered to fit existing flow, becomes section 12).
- Delete `src/pages/IntellectualProperty.tsx`.
- In `App.tsx`, redirect `/intellectual-property` → `/terms-and-conditions#intellectual-property`.
- Update every `<Link to="/intellectual-property">` to use the new anchor (footer, signup, settings, etc.).
- Remove the IP entry from the new `/legal` index page (step 5).

## Files

**Migration**
- `supabase/migrations/<ts>_credential_scores.sql`

**Edge functions**
- new `supabase/functions/score-credentials/index.ts`
- edited `supabase/functions/share-incident-with-contacts/index.ts`
- edited `supabase/functions/dispatch-sos/index.ts`

**Frontend**
- `src/components/legal/LegalDocLayout.tsx` (TOC fix + tense context)
- `src/pages/TermsAndConditions.tsx` (merge IP, present tense)
- `src/pages/PrivacyPolicy.tsx`, `BusinessAssociateAgreement.tsx`, `PatientConsent.tsx`, `CookiePolicy.tsx` (present tense)
- delete `src/pages/IntellectualProperty.tsx`
- new `src/pages/Legal.tsx`
- `src/components/layout/TopBarIcons.tsx` (Legal Terms menu item)
- `src/App.tsx` (add `/legal`, redirect `/intellectual-property`, doctor incident route)
- `src/pages/patient/MyDoctors.tsx` — no change (consumes `stars` field)
- `src/modules/holarchelp/README.md` (cleanup stale URLs)

## Out of scope
- Visual redesign of legal pages
- Per-jurisdiction localisation of legal copy
- Doctor mobile push notifications (SMS/email) — only in-app notifications
