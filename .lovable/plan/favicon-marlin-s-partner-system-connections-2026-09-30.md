# Favicon + Marlin's partner-system connections

## 1. New favicon
- Use the blue heart-with-plus image as the browser tab icon and home-screen icon.
- Resize it to a square (padded, not stretched) for the tab icon, 180px for Apple, and 192/512px for the installed-app icons.
- Update the app manifest name to "Holarc Wealth" while there.

## 2. Connect Beeswax, Iress XPLAN and Astute using Marlin's login
How it will work:
- Marlin's username and password for each system are saved in the secure secret store through a secure form. They never appear in chat, in the code, or in the browser.
- One backend connector per system signs in with his details **once**, keeps the session it gets back, and signs in again only when that session expires.
- The workflow uses them where they fit:
  - **Astute** → Step 2 Portfolio "Astute pull" (existing policies for the client after consent is signed).
  - **Iress XPLAN** → push client facts, ROA and policy schedules to the CRM (Step 2 "push to CRM", Step 6 "policy schedule to portal and CRM").
  - **Beeswax** → role to be confirmed with you (see below).
- Every pull or push is written to the workflow history, and a failed sign-in shows a clear message to the Wealth Manager ("Astute sign-in failed — ask Marlin to confirm his password") instead of stopping silently.
- Only Wealth Managers and FSP users can trigger these; clients never see Marlin's access.

## Things to confirm before building
- **Proper API access:** XPLAN and Astute normally give software partners an API key or client ID, not just a user login. Signing in with a person's password can break with 2-factor codes or break the providers' terms. If Marlin can request partner/API access from Iress and Astute, that is the reliable route; his login can still be used for testing.
- **2-factor login:** if any of the three asks for an SMS or app code, a one-time sign-in cannot run automatically.
- **Beeswax:** which Beeswax product this is, and what the workflow needs from it.
- Credentials are requested only after you approve this plan.

## Technical details
- Favicon: `magick` from the upload into `public/favicon.png` (64px), `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`; remove `public/favicon.ico` if present.
- Secrets: `ASTUTE_USERNAME/PASSWORD`, `XPLAN_USERNAME/PASSWORD` (+ `XPLAN_SITE_URL`), `BEESWAX_USERNAME/PASSWORD` (+ base URL).
- Edge functions `astute-sync`, `xplan-sync`, `beeswax-sync`; cached session tokens in a service-role-only `partner_system_sessions` table (no client grants); results recorded via existing wealth_* DB functions so stage changes stay DB-driven.
