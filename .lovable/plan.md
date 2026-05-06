## Goal
Fix the blank `/track/:token` page so anyone opening a shared SOS link sees the location, even when Google Maps fails to load.

## Root cause
The Google Maps API key is HTTP-referrer-restricted to `holarchealth.com` and `medpad.lovable.app`. On the `*.lovableproject.com` preview domain it's blocked, so the map container renders empty with no fallback. The tracking RPCs themselves work (36 GPS points returned for the test token).

## Changes

### 1. `src/components/holarchelp/LiveMap.tsx` — resilient map
- Try Google Maps first (existing path).
- If the script fails to load or the key is rejected, fall back to an OpenStreetMap embed iframe:
  `https://www.openstreetmap.org/export/embed.html?bbox=…&marker=lat,lng` (no API key, works on every domain).
- Always render an "Open in Google Maps" link as a final guarantee.

### 2. `src/pages/PublicTrack.tsx` — always-visible info
- Show "Last position: lat, lng" above the map so it's visible even if the map is blank.
- Add buttons: Open in Google Maps, Open in Apple Maps, Copy coordinates.
- Add "Last update Xs ago — refreshing every 7s" badge.

### 3. Share-link helper — prefer published origin
- Add `getPublicTrackUrl(token)` that returns `https://medpad.lovable.app/track/<token>` (or `holarchealth.com` if already on it) instead of the preview `lovableproject.com` origin, so recipients aren't blocked by the preview domain.
- Use it wherever the SOS share link is generated/copied.

## Out of scope
- Re-keying or re-restricting the Google Maps API key.
- Backend, RLS, or RPC changes (already verified working).
- Route path `/track/:token` stays the same.