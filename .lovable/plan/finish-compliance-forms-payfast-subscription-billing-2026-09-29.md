# Finish compliance forms + PayFast subscription billing

## Part A: Finish the open items from the last pass
1. **Workflow guardrails**
   - Later stages stay locked until the client signs Form 1 (Mandate).
   - An adverse FICA finding marks the client High Risk and blocks onboarding, with the reason shown in the Live view.
   - An application can't be submitted unless the Record of Advice was signed before it.
2. **Real FICA uploads:** the ID, proof of address and bank proof files are stored privately and attached to the saved form, instead of just their names.
3. **Drawn signatures:** clients and advisers sign with a finger or mouse on the forms. Typed names stay as a fallback.
4. **Commission entry:** when an insurer issues a policy, the Wealth Manager enters the monthly premium and commission. Targets and Commission then shows real progress.

## Part B: Billing and subscriptions with PayFast
- Plans for Wealth Managers and firms, e.g. Adviser monthly and Firm monthly. You'll give the prices in rand.
- A **Subscribe** button opens the PayFast checkout. PayFast then bills the card or debit order every month.
- PayFast tells the app about every payment, failure and cancellation. The subscription status updates automatically, and each payment is logged.
- A **Billing** page in My Business shows:
  - the current plan and status
  - the next billing date
  - payment history
  - Cancel and Change plan buttons
- The existing free trial stays. When the trial ends or a payment fails, access is limited, the same as today.
- Test mode (PayFast sandbox) comes first, then a switch to live.

### What I need from you (asked securely after approval)
From your PayFast dashboard, under Settings, then Developer Settings:
- **Merchant ID**
- **Merchant Key**
- **Passphrase**: set one there if it's blank. It is required for subscriptions.
- Whether to start in **sandbox (test)** or **live**
- The **plan names and monthly prices in ZAR**

## Technical details
- Guardrails go in the DB functions that already work out blockers and stage (`wealth_blockers` / `wealth_derive_stage`): they check for `mandate_signed`, block on `fica_adverse`, and compare the `roa_signed` created_at with the application's submitted_at. The UI never writes stage directly.
- A private storage bucket `compliance-docs` with RLS through `can_view_patient_record`. File paths are saved in `documents.attachments`.
- The signature pad uses a canvas and saves a PNG to storage alongside the typed name.
- The commission fields go in an "Issued" dialog on the application item in the Live Workspace.
- PayFast secrets: PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE and PAYFAST_MODE.
- Edge functions:
  - `payfast-checkout` checks the signed-in user, then builds the signed subscription form fields (MD5 signature, `subscription_type=1`, frequency monthly).
  - `payfast-itn` is the payment notification endpoint. It verifies the signature, the source host, the amount, and a call back to PayFast's validate URL. Only then does it update `subscriptions` and insert into `payment_history`.
  - `payfast-manage` handles cancel and pause through the PayFast subscriptions API.
- `pricing_config` holds the ZAR plans. The existing `useSubscriptionGate` reads the PayFast status. PayPal code is kept but hidden.
- Verify with the sandbox: a test subscription, ITN received, and the status goes active.
