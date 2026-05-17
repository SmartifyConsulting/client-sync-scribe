## Plan

### 1. Restore the contact phone number on signup

`src/pages/Auth.tsx`
- In `renderDoctorStep`, replace the current "Country / Language" block with the original "Mobile Number" block (CountrySelector + phone input side-by-side, "Language will be set to: …" helper using `mobileNumber` state).
- In `renderPatientStep`, same restoration using `phone` state.
- Restore submit logic in `handleFinalSubmit`:
  ```
  const phoneDigits = userRole === "doctor" ? mobileNumber : phone;
  const fullPhone = phoneDigits ? `${countryCode} ${phoneDigits}` : null;
  ```
  and pass `fullPhone` back into `profiles.mobile_number` and `patients.phone` as before.

`src/pages/ProviderSignup.tsx`
- Restore the "Contact phone" input field and pass `phone` to `register-emergency-provider`.

No DB changes — `mobile_number` / `phone` / `contact_phone` columns are still nullable.

### 2. Fix verification email delivery (Option A — Lovable Emails on `notify.holarchealth.com`)

The current Lovable Emails sender is `notify.nigeria.holarchealth.com` and DNS is still pending — that's why Marlene never received the confirmation email. Switching to `notify.holarchealth.com` (a sibling of your already-active Resend domain) is the right path.

Steps I will run:
1. Open the email-domain setup dialog so you can add the new sender domain `notify.holarchealth.com`. The dialog walks you through publishing the two NS records at your registrar.
2. Once the domain is added, Lovable's auth-email hook (already wired into Supabase signup, password reset, magic link, email change) will start using it. No code changes required — Supabase logs already show the hook firing successfully.
3. Re-trigger Marlene's confirmation email from the Auth screen (Resend confirmation link) so she gets a fresh email from the new domain once DNS verifies.
4. Remove the now-redundant custom `auth-email-sender` Resend wiring from `ForgotPassword.tsx` so password resets also go through the unified Lovable Emails pipeline (one less moving part to maintain). The old function file can stay in place but won't be invoked.

### Things I will NOT touch
- The Resend connection / `auth-email-sender` edge function (kept in case you want it back; just unused after Step 4).
- Database schema, RLS, profile triggers.
- The current `notify.nigeria.holarchealth.com` domain — you can leave or remove it from Cloud → Emails later; it does no harm while pending.

### Order of operations
1. Patch `Auth.tsx` + `ProviderSignup.tsx` to bring back the phone field.
2. Open the email setup dialog for `notify.holarchealth.com`. You add the NS records at your registrar.
3. While DNS propagates, signups still trigger the hook — emails will start landing automatically once verification flips to active (usually < 1 hour, up to 72 hours).
4. After verification, retry Marlene's signup confirmation.

Ready to implement on approval.
