# Bank details, session layout, and branded document emails

## 1. Bank details won't save

Confirmed cause: the five banking fields on My Practice (Account Name, Bank Name, Account Type, Account Number, SWIFT Code) are written to the `profiles` record, but those columns do not exist in the database. Every save therefore errors and the values are lost on reload.

Fix:
- Add the five banking columns to the profiles table (text, nullable). No new access rules are needed — banking data stays readable/writable only by the profile owner, same as the rest of the profile.
- Keep the existing save call as-is once the columns exist, and surface a clear error message if a save still fails.

Layout change (Banking Details accordion):
- Switch to the same horizontal row style used by Personal Information — bold 12px label on the left, field on the right.
- Arrange the fields in two columns so the section is half its current height.

## 2. Session recording layout

Restore the live Session Recording screen to:

```text
┌──────────────┬───────────────────────────────────────┐
│ Record       │  Patient Overview (spans 3 columns)   │
│ Session      ├───────────────────────────────────────┤
│ (recorder,   │  AI Clinician Notes                   │
│  audio, etc) │  (directly below the recorder frame)  │
└──────────────┴───────────────────────────────────────┘
```

- Patient Overview becomes the full-width band across the workspace (3 columns wide), not a narrow middle column.
- AI Clinician Notes moves out of the right-hand column and sits below the Session Recorder frame.
- Everything else on the screen (personal notes / drawing tabs, generated documents, action points) keeps its current position and styling.

## 3. Historic session drill-down matches the live screen

The session detail screen currently uses its own three-column arrangement. It will be rebuilt to use the exact same frame arrangement, headings, spacing and components as the live recording screen above — recorder panel replaced by the session playback/summary frame in the same slot, Patient Overview spanning the workspace, AI Clinician Notes below, then the same results panels (transcript, audio download, generated documents, action points).

## 4. Branded emails to patients, medical aids and pharmacies

Current state: the document email function sends plain Arial-styled HTML with no logo and no brand colour. Fix across all outbound document/invoice/report emails:
- One shared branded email shell: Holarc Health logo header, deep-red brand accent, app typography (Sora headings / Manrope body with web-safe fallbacks for email clients), consistent footer with the practice name and the standard confidentiality note.
- Apply it to document emails, invoice/statement emails, and prescription/medical-aid sends so the recipient sees the same brand regardless of document type.
- The document body itself keeps rendering exactly as it does on screen (letterhead, header/footer template) inside the branded shell.

## 5. Test emails

Send one branded sample of each type, populated with clearly-marked test data, to georgia.adams@smartify.co.za:
- Clinical: referral letter, medical certificate, clinical summary
- Medical aid: motivation letter, claim/authorisation
- Pharmacy: prescription, repeat prescription
- Billing: invoice, statement

Each will be prefixed "TEST —" in the subject so they are obvious in the inbox.

## Technical notes

- Migration: `alter table public.profiles add column bank_account_name text, bank_name text, bank_account_type text, bank_account_number text, bank_swift_code text;` — existing profile policies already restrict rows to the owner.
- Files: `src/pages/MyPractice.tsx` (banking layout), `src/pages/Sessions.tsx` and `src/pages/SessionDetail.tsx` (shared layout), `src/features/documents/utils/documentEmailHtml.ts` plus `supabase/functions/send-document-email`, `send-invoice-report` (branded shell), and a one-off invocation script for the test sends.
