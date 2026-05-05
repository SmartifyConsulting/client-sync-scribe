# Polish requests

## 1. Remove revoke notifications (both directions)

- `src/pages/patient/MyDoctors.tsx` (~line 159): drop the `notifications.insert({ type: 'access_revoked', ... })` block. Keep the DB update + toast. No doctor→patient revoke notification was found, so nothing to remove on the doctor side.

## 2. Remove duplicated header in Daily Vitamins, Supplements & OTC

`PatientDetailsEditor.tsx` already renders `<SectionHeader icon={Sparkles} label="Daily Vitamins, Supplements & OTC" />` above `<DailyMedsInline />`, and `DailyMedsInline.tsx` re-prints the same title (lines 127–133).

- Edit `src/features/patients/components/DailyMedsInline.tsx`: remove the inner header `<div>` (Sparkles icon + label) and the helper paragraph "Earn Vulas (reduced rate)…". Keep the form.

## 3. SOS / HolarcHelp — enabled by default for everyone (no admin toggle for now)

- Skip building any admin UI.
- Make the gate permissive: `src/modules/holarchelp/hooks/useHolarcHelpAccess.ts` should return `enabled: true` regardless of the `app_modules.holarchelp` row and the per-user `holarchelp_enabled` flag, so every authenticated user can reach `/patient/holarchelp/*`.
- Bottom-nav SOS button stays as-is (already added for all patients).

## 4. Footer: surface HIPAA + all legal docs together

- Edit `src/components/layout/Footer.tsx`: replace the two-link row with a wrapping cluster of separators (`·`):
  - Terms & Conditions
  - HIPAA Patient Consent & Authorization → `/patient-consent`
  - HIPAA Business Associate Agreement → `/business-associate-agreement`
  - Intellectual Property
- Mobile: wraps to multiple lines, centered, small muted text.

## 5. Reformat the legal agreements professionally

Apply a consistent, professional layout to all four pages while preserving every clause verbatim:

- `src/pages/TermsAndConditions.tsx`
- `src/pages/PatientConsent.tsx` (rename heading to **HIPAA Patient Consent & Authorization**)
- `src/pages/BusinessAssociateAgreement.tsx` (rename heading to **HIPAA Business Associate Agreement**)
- `src/pages/IntellectualProperty.tsx`

Shared visual frame for each:
- Sticky header with back button, document title, and a "Print / Save PDF" button (`window.print()`).
- Metadata block at top: Effective Date · Last Updated · Version 1.0 · Document Owner.
- Auto-numbered Table of Contents linking to each H2.
- `prose prose-slate` body, justified text, consistent H2/H3 spacing, small caps section labels, divider rules between major sections.
- Signature / footer block: "Holarc Health (Pty) Ltd · contact@holarchealth.com · This document is governed by the laws of the Republic of South Africa."
- Print stylesheet adjustments so the header and back button collapse on print.

No clause text is changed — only structure, headings, and styling.

## Files to edit

- `src/pages/patient/MyDoctors.tsx`
- `src/features/patients/components/DailyMedsInline.tsx`
- `src/modules/holarchelp/hooks/useHolarcHelpAccess.ts`
- `src/components/layout/Footer.tsx`
- `src/pages/TermsAndConditions.tsx`
- `src/pages/PatientConsent.tsx`
- `src/pages/BusinessAssociateAgreement.tsx`
- `src/pages/IntellectualProperty.tsx`

No DB migrations required.
