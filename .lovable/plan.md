

# Address Autocomplete Fix, Record Shading, Section Frames

## 1. Fix Google Maps address autocomplete

The `AddressAutocomplete` component and the edge function code both look correct, and the `GOOGLE_MAPS_API_KEY` secret is configured. The issue is likely that the edge function needs redeployment. I will redeploy `google-places-autocomplete` and also add a visible loading/error indicator to the `AddressAutocomplete` component so users know it's working (or why it's not).

**File:** `src/components/patients/AddressAutocomplete.tsx` — Add a subtle "Searching..." indicator when fetching, and log errors to help debug if the API key or function has issues.

## 2. Shade surgery and family history records with light teal

**View mode** (lines 908-916, 928-934): Change record background from `bg-muted/30 border-border/50` to `bg-primary/5 border-primary/20` (light teal).

**Edit mode** (lines 1350-1363, 1391-1403): Same change — records get `bg-primary/5 border-primary/20`.

## 3. Wrap Current Medications in its own bordered frame + heading

**View mode** (lines 875-898): Wrap in a `<div className={sectionFrame}>` with an h3 heading: `<h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5"><Pill className="h-3.5 w-3.5" /> Current Medications</h3>`. Remove the existing `<Label>Current Medications</Label>`.

**Edit mode** (lines 1260-1308): Wrap in `<div className={sectionFrame}>`. Change the `<Label>` to an `<h3>` heading matching the standard format.

## 4. Wrap Surgeries and Dates in its own bordered frame

**View mode** (lines 900-918): Wrap the entire surgery block in `<div className={sectionFrame}>`.

**Edit mode** (lines 1310-1366): Wrap in `<div className={sectionFrame}>`.

## 5. Wrap Family History in its own bordered frame

**View mode** (lines 920-937): Wrap in `<div className={sectionFrame}>`.

**Edit mode** (lines 1368-1406): Wrap in `<div className={sectionFrame}>`.

## Technical Summary

| File | Change |
|------|--------|
| `src/components/patients/AddressAutocomplete.tsx` | Redeploy edge function; add loading indicator |
| `src/components/patients/PatientDetailsEditor.tsx` | Shade surgery/family records with `bg-primary/5`; wrap Medications, Surgeries, Family History in `sectionFrame` divs with proper headings (both view and edit modes) |

