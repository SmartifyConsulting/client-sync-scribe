# Companion store distribution

Prepared 3 November 2026 for Companion 1.6.4. No listing has been uploaded or published by this work.

## Broker experience

1. In Holarc, choose Install Companion.
2. The approved Chrome Web Store listing opens. Choose Add to Chrome and confirm the browser permission prompt.
3. Return to Holarc and choose Already installed - check again (or refresh the page).
4. Subsequent reviewed releases update through the store's normal update mechanism; users do not unzip releases or use Developer mode.

Ordinary websites cannot silently install extensions. Managed-company browsers can use administrator deployment policies, but no policies or browser settings were changed here.

## Existing publisher account

Use the organisation's existing Chrome Web Store developer account. First check whether Holarc Wealth Companion already has an item so its extension ID is preserved. Do not create a duplicate item. If there is no item, create a draft using the prepared ZIP and complete Google's listing/privacy fields. Publication and review must finish before the normal Install button can be enabled.

An Unlisted listing is an option if the organisation wants link-based distribution rather than store search discovery. Unlisted is not an authentication boundary; app/portal sign-in still controls access.

The package contains manifest.json, background.js, bridge.js, portalJourney.js and icon.png at its root. It contains no tests, client records, passwords, OTPs, environment files, developer tokens or recording manuals. It preserves the existing permissions; it does not enable new access silently.

## Listing draft

Name: Holarc Wealth Companion

Short summary: Connect insurer portals and collect quote PDFs from Holarc Wealth using your authorised provider accounts.

Single purpose: Assist a signed-in Holarc Wealth adviser with broker-initiated provider sign-in, verification and quote-document collection for authorised client cases.

Description:
Connect the provider accounts you already use from Holarc Wealth. The Companion assists with portal sign-in, requests your input when verification is needed, and returns supported quote PDFs to the authorised client workspace. Activity and errors appear in Holarc. Provider support varies; an installed Companion does not guarantee that every provider or product can be quoted automatically. It does not accept insurance applications or send client emails as part of collecting quotes.

The publisher must supply its verified support contact, ownership details, appropriate store screenshots and a published privacy-policy URL that accurately covers these flows. Do not invent a privacy/contact URL or claim that no personal information is processed.

## Privacy and permission facts for publisher review

- Provider credentials are supplied by the unlocked Holarc screen and held temporarily for the requested job. Passwords and OTPs must not appear in logs, screenshots or persistent extension storage.
- Approved client/quote fields can be entered into the requested provider portal. Quote PDFs can contain identity, financial and health-related information and return to Holarc's authenticated document service.
- The extension sees tab and download metadata to associate a broker-initiated provider session with matching PDFs. It does not offer general browsing-history collection or unrelated-download upload.
- tabs: identify/manage the broker-initiated portal and associated popup tabs.
- scripting: run the bundled sign-in and quote adapters on the configured, trusted portal.
- storage: retain temporary routing/scenario metadata; never persistent plaintext passwords or OTPs.
- downloads: match supported quote PDFs to their provider session.
- HTTPS host permissions: required by the current support for broker-configured provider origins and their trusted redirects. These permissions are broad and must be disclosed accurately in the store review; they are not a reason to claim that all websites are monitored.
- All extension logic is bundled locally. No remote-code loader was added.

## Activate the app install link after approval

Set the frontend build variable VITE_COMPANION_STORE_URL to the canonical approved URL, such as the URL copied from the actual store item. Rebuild and publish Holarc. Never put a publisher token or API key in a VITE_ variable; frontend variables are public.

Only HTTPS chromewebstore.google.com/detail/... links with a valid-shaped store item ID are accepted by the app. Until a real link is configured, the app retains its existing manual setup rather than displaying a fake store install link.

For packaging:

powershell -File scripts/package-companion.ps1 -OutputPath <destination.zip>

Existing unpacked development installations will not automatically turn into store installations. When migrating an existing tester, install the approved store item and remove the old unpacked copy so two Companions do not process the same requests.

## Verification completed

The app build, official-store URL validation and store/manual setup rendering are checked locally. Google review, listing identity, published install URL and live Add to Chrome flow remain pending publisher-dashboard access. No browser policies were set and no extension was silently installed.

Official references:
- https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions
- https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
- https://developer.chrome.com/docs/webstore/register/
- https://developer.chrome.com/docs/webstore/update
