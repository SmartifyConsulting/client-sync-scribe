## Where we are
You've done Steps 1–5 in Google Cloud, so you should now have an API key (`AIza…`) that's restricted to `holarchealth.com` / `www.holarchealth.com` and has Maps JavaScript API + Routes API + Geocoding API enabled.

## What I'll do next (in build mode)
1. Call `standard_connectors--connect` for the **Google Maps Platform** connector. You'll see a dialog with your existing managed connection plus an option to **Add a new connection** — pick **Add new**.
2. The dialog will ask for the API key. Paste the key from Step 4. Save.
3. Lovable injects it as `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` (browser) and `GOOGLE_MAPS_API_KEY` (server). The existing `LiveMap`, `ProviderMap`, `PinMap`, and `routes-eta` edge function read those names already — **zero code changes**.
4. Republish to `holarchealth.com`.

## Then we verify together
1. Open `https://holarchealth.com` in an incognito window.
2. Open the browser console (F12).
3. Navigate to SOS / Active Mission / Fleet Live / a provider profile.
4. Map tiles should render and the console should be clean — no `RefererNotAllowedMapError`, `ApiNotActivatedMapError`, or `REQUEST_DENIED`.

If anything errors, paste the console message and I'll map it back to which Google Cloud step needs a tweak (referrer typo, missing API, billing, etc.).

## Important: don't paste the API key into chat
The connect dialog has a secure secret field. Paste the key **only** there — not into the chat. If it ever ends up in chat by accident, rotate it in Google Cloud Credentials and create a new one.

## What I need from you
Reply **"approve"** and I'll trigger the connect dialog right away.