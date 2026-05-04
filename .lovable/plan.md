## Plan: Switch Google Places integration to Places API (New)

**Root cause confirmed from console:** `REQUEST_DENIED — You're calling a legacy API, which is not enabled for your project. Switch to the Places API (New).`

Your `GOOGLE_MAPS_API_KEY` project only has **Places API (New)** enabled, not the legacy Places API. Rather than asking you to enable the old one (Google is deprecating it), I'll migrate both edge functions to the New API.

### 1. `supabase/functions/google-places-autocomplete/index.ts`
Replace the legacy GET call to `maps.googleapis.com/maps/api/place/autocomplete/json` with a POST to `https://places.googleapis.com/v1/places:autocomplete`:
- Auth header: `X-Goog-Api-Key: <GOOGLE_MAPS_API_KEY>` (no `key=` query param).
- Body: `{ input, includedPrimaryTypes? }`. Map our existing `types` param:
  - `"any"` (or omitted) → no filter
  - `"address"` → `["street_address","route","premise"]`
  - `"establishment"` → `["establishment"]`
  - `"(cities)"` → `["locality","administrative_area_level_3"]`
  - `"(regions)"` → `["administrative_area_level_1","administrative_area_level_2","country"]`
- Response shape: `{ suggestions: [{ placePrediction: { placeId, text:{text} } }] }`. Flatten back to our existing `{ predictions: [{ description, place_id }] }` so the client doesn't need changes.
- On non-2xx, log + return `{ predictions: [], status, error_message }` (preserves the debug toast).

### 2. `supabase/functions/google-place-details/index.ts`
Replace the legacy GET to `place/details/json` with `GET https://places.googleapis.com/v1/places/{placeId}`:
- Headers: `X-Goog-Api-Key`, `X-Goog-FieldMask: id,displayName,formattedAddress,location,addressComponents,internationalPhoneNumber,websiteUri`.
- Map response back to our existing flat shape: `{ name, formatted_address, lat, lng, city, country, phone, website }`. Address-component lookups use `longText` (new API) instead of `long_name` (legacy).
- The client (`LocationPicker` in `HolarcHelpProviders.tsx`) needs **no changes** — same response contract.

### 3. Verify in Google Cloud (one-time)
After deploy, the calls succeed if **Places API (New)** is enabled (which your console error confirms it is). No other Google Cloud changes needed. If the server-side key has API restrictions, ensure "Places API (New)" is in the allowed list.

### Files touched
- `supabase/functions/google-places-autocomplete/index.ts` (rewrite)
- `supabase/functions/google-place-details/index.ts` (rewrite)

No client-side or DB changes.
