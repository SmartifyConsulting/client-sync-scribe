# Fix untranslated Provider Signup screen

## What this screen is

`/provider-signup` — the public application form organisations use to join the
platform: hospitals, emergency service providers, insurers and pharmacies.
It captures organisation details, directors, contact info and a certified copy
of the licence, creates the administrator account, and puts the application in
"pending" until an admin approves it.

It appears when:
- A visitor picks a provider role on the landing page (`/provider-signup?kind=...`)
- The "Sign up as a provider" path from the Auth screen
- The Provider Gate prompts an unlinked user to complete signup

## Why it shows code-like text

The page renders raw key names ("auth.provider.title", "auth.common.continue")
because the `auth` namespace does not exist in the translation files. The page
calls 22 keys under `auth.provider.*` / `auth.common.*`, and none of them are
defined in `src/i18n/locales/en.json` or in the shared UI translations, so
i18next falls back to printing the key itself. Everything else on the page that
is plain English (field labels inside the vetting form) is hardcoded, which is
why only some text looks broken.

## Fix

Add an `auth` block to the English locale with all keys the screen uses:

- `auth.common`: continue, error, home, returnHome
- `auth.provider`: title, subtitle, organizationType, hospital, emergency,
  insurance, pharmacy, applicationLabel, formIncomplete, licenseRequired,
  licenseMessage, passwordRequired, applicationExists, emailAlreadyRegistered,
  signupFailed, applicationReceived, pendingApproval, savePassword,
  copyCredentials, copied, alreadyHaveAccount

Since every locale merges the English UI base as a fallback, the other 24
languages will show English wording instead of key names immediately; they can
be translated in a later pass.

## Technical notes

- Keys go in `src/i18n/locales/en.json` (top-level `auth` object). No component
  changes needed — `ProviderSignup.tsx` already references the correct keys.
- Also verify the organisation-type select: the value list uses `esp` for the
  emergency option while the component's state expects `emergency`, so picking
  "Emergency service" currently does not change the form. Correct that value.
