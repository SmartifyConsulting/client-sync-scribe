## Plan: Admin Providers UX fixes

### 1. Reorder fields in `ProviderDialog` (`src/pages/admin/HolarcHelpProviders.tsx`)
Move the **Name / Company name** field to the **top** of the dialog, before the location search. Then the location search field's label becomes "Search address from name" and its placeholder updates to "Start typing the provider name…". The autocomplete suggestions still autofill address, city, country, lat/lng, phone — but the name field is preserved (no longer overwritten by the place result, since user typed it first).

### 2. Single "+ Add" button with type chooser
- Replace the dynamic `+ Add Hospital / + Add Ambulance` button (line 313–316) with a single `+ Add` button.
- Clicking it opens a small chooser dialog (or a 2-button popover) asking: **Hospital** or **Ambulance**.
- Selection sets the `kind` and opens the existing `ProviderDialog`.

### 3. Remove "Accepting patients" from admin
- Remove the "Accepting patients" Switch row inside `ProviderDialog` (lines 506–512). Do not include `accepting_patients` in the insert/update payload — DB default applies for new rows; existing values are preserved on edit.
- Remove the **Accepting** column from the admin table (header + `renderRow` cell, lines 194–201, and `headers` array on line 214). Remove the `setAccepting` handler (lines 136–140).
- Note: providers continue to control `accepting_patients` from their own provider view (already implemented).

### 4. Fix Location search (currently not returning results)
Root cause: the `LocationPicker` invokes `google-places-autocomplete` with `types: "establishment"`, but Google Places Autocomplete rejects requests that combine `establishment` with anything else and is sensitive to the exact request format. Also, the edge function whitelists `establishment` but the upstream Google call may be returning `ZERO_RESULTS` or `REQUEST_DENIED` silently because the function only forwards `predictions` and ignores `status`/`error_message`.

Fixes:
- **Edge function** `supabase/functions/google-places-autocomplete/index.ts`: log and surface Google's `status` and `error_message` to the response when `predictions` is empty so we can debug. Keep behavior backward-compatible (still return `{ predictions: [] }` on success-with-no-results).
- **Client `LocationPicker`**: handle the `error` returned from `supabase.functions.invoke` (currently ignored), show a toast on failure, and console.log the response. Also, drop `types: "establishment"` and instead omit the `types` parameter (defaults to `address` in the edge function — which actually returns establishments + addresses mixed when no type is sent). Will switch the edge function default to no-type when caller sends `types: "any"` to allow business-name search.
  - Concretely: edge function adds support for `types: "any"` → omits `&types=` from the Google URL entirely (Google returns all categories including establishments + addresses).
  - Client sends `{ input, types: "any" }`.
- After the fix, typing a hospital name (e.g. "Netcare Milpark") returns predictions; selecting one calls `google-place-details` and autofills.

### 5. Verify Google API key
After deploy, confirm `GOOGLE_MAPS_API_KEY` is set and that the Google Cloud project has **Places API** enabled (Autocomplete + Details). If autocomplete still returns `REQUEST_DENIED`, surface the message in chat with a one-line fix instruction (enable Places API / remove HTTP-referrer restrictions on the server-side key).

### Files touched
- `src/pages/admin/HolarcHelpProviders.tsx` (dialog reorder, single + Add chooser, remove accepting toggle/column, LocationPicker error handling + types)
- `supabase/functions/google-places-autocomplete/index.ts` (support `types: "any"`, surface Google status)

### Out of scope
- No DB schema changes.
- Provider-side accepting toggle is already wired and unaffected.
