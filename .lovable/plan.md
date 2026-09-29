# Live Workspace: personal wording, locked steps, KYC screening and signed disclosure/LOA

## 1. Wording that speaks to whoever is reading
- Each step's guidance gets two versions: one for the client and one for the Wealth Manager.
- Client view uses "you" and "your". For example, "Upload your ID" or "Your Wealth Manager will now prepare your quotes. You don't need to do anything yet."
- Wealth Manager view uses "you" for their own tasks and "the client" or the client's first name for the client's tasks. For example, "Georgia needs to sign her disclosure."
- Steps done by the system or insurer are described plainly, such as "We are checking your identity" or "Your insurer is reviewing the application."
- The step labels in the list follow the same rule. The client sees "You: Sign disclosure and LOA" and "Your Wealth Manager: Present ROA" instead of CLIENT or ADVISOR tags.

## 2. Locked steps
- When a process starts, only Step 1 is open. Steps 2 to 6 are collapsed and show a lock. They can't be opened until the workflow reaches them.
- Finished steps stay open to view. They show a tick.
- Inside the current step, finished sub-steps and the live one can be clicked. Later sub-steps are greyed out, and clicking them does nothing.
- The Working Window always follows the live step. You can still look back at finished steps and return with "Back to current".

## 3. New Step 1 (Client Onboarding)
1. CLIENT: Scan QR or open secure link
2. SYSTEM: KYC, AML and PEP Screening
3. CLIENT: Sign disclosure and LOA

The footer stays "No advice until all checks pass".

### Sub-step 2: KYC, AML and PEP Screening (Didit)
- The client clicks "Verify my identity" in the Working Window. This opens a Didit check for their ID, a live selfie, and AML and PEP screening.
- Didit sends the result back to the app. The step then shows Passed, Needs review or Failed, with the date.
- The Wealth Manager sees the detailed outcome, such as PEP match or sanctions hit. The client sees a plain-language status.
- The workflow moves to sub-step 3 only after a pass. Needs review creates a task for the Wealth Manager.

### Sub-step 3: Sign disclosure and LOA
- The Working Window shows the two documents, the Disclosure Agreement and the Letter of Authority (LOA), one below the other. Each sits in a neat framed card, like your example.
- Each card has a Preview button that opens the full document and a Download button that saves a PDF. The document is filled in with the client's and firm's details.
- Each card has a "Sign" button. The client draws or types a signature, and it is saved with the date, time and IP address.
- A signed card shows the signature in script, "Digitally signed · date, time", and a "signed" badge.
- Below that is a sealed certificate panel. It shows the document name, the time it was sealed and a unique seal code, plus View certificate and Download buttons. It uses the Holarc Wealth logo, not Izenzo's.
- Once both documents are signed, sub-step 3 completes on its own and Step 2 (Portfolio) unlocks for both viewers in real time. Signed documents can't be changed afterwards. Any change needs a new version and a fresh signature.

## 4. Georgia
- Georgia's current workflow stays at Step 1. After this change she sees the new sub-steps, and the Didit check is her next action.

## What I need from you
- Your **Didit API key** and **workflow ID**. I'll ask for these using a secure form once you approve this plan.
- The wording for the **Disclosure Agreement** and **LOA**. If you don't have it ready, I'll write a standard South African FAIS-style draft for you to check.

## Technical details
- `groups.ts`: the gateway sub-steps are replaced. `stepGuidance.ts` gets `{ client, manager }` text for every step. The owner label is worked out from the viewer and owner, for example "You", "Your Wealth Manager" or the client's first name.
- `WorkflowGroupCard`: a `locked` state for groups after the current one. Clicks are ignored for later sub-steps.
- New table `wealth_kyc_checks` (workflow_id, patient_id, provider 'didit', session_id, status, aml_result, pep_result, raw jsonb, timestamps), with grants and RLS through `can_view_patient_record`.
- New table `wealth_signed_documents` (workflow_id, patient_id, doc_type 'disclosure'|'loa', version, content_html, content_hash, signature_image, signer_name, signed_at, signer_ip, user_agent, seal_hash). There are no update rights after signing.
- Edge functions: `didit-create-session` starts a check and returns a URL. `didit-webhook` checks the signature, saves the result and calls a DB function to move the workflow on. `sign-wealth-document` captures the IP from the request headers, calculates a SHA-256 seal and inserts the row.
- Stage changes happen only in DB functions, for example a `wealth_recompute` that reads the KYC and signature rows. The UI never writes the stage.
- The PDF export reuses the existing document PDF utility, with the Holarc Wealth letterhead.
