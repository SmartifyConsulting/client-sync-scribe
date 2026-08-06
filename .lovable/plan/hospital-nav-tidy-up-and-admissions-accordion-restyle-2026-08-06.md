# Hospital nav tidy-up and Admissions accordion restyle

## 1. Sidebar: drop the "Emergency" heading
The hospital sidebar's Emergency group (Live Queue, ER Dispatch, Incoming ER, Triage Board, Ward Board) keeps all its items, but the grey uppercase "EMERGENCY" label above them is removed so the group renders unlabelled.

## 2. Admissions screen header
- Remove the duplicated "Admissions" heading: the page wrapper currently renders an eyebrow + "Admissions" title, and the inner screen renders "Admissions" again. Only one heading remains.
- Rename the eyebrow "Hospital Emergency Operations" to "Hospital Operations".

## 3. Admissions accordion styling
Match the look of the Sessions accordion in the doctor profile, and apply the tightened styling to both places:
- Patient group header rows become shorter (reduced vertical padding).
- Inner admission records are spaced apart with padding/gaps instead of sitting flush against each other.
- Each admission record renders as its own collapsible row inside the patient group (nested accordion), consistent with the Sessions list, rather than a dense table.
- The record header shows patient/admission summary (ward, bed, admitted date, status); expanding reveals attending doctors, nurses and the action buttons (assign doctor, assign nurse, transfer, log activity, discharge).

## Technical notes
- `src/modules/holarchelp/nav/registry.ts` — clear the Emergency module's `title`/`titleKey` so `ProviderSidebar` skips the heading.
- `src/modules/holarchelp/pages/provider/hospital/AdmissionsScreen.tsx` — keep the eyebrow (new "Hospital Operations" copy, new i18n key) and remove the duplicate `h1`, or keep the `h1` and drop the inner heading in `InpatientsScreen`.
- `src/components/ui/section-accordion.tsx` — reduce `SECTION_TRIGGER_*` vertical padding (`py-3` → `py-2`) and give `SECTION_CONTENT_CLASS` consistent row spacing; this also tightens My Sessions, Tasks and Documents which share the tokens.
- `src/modules/holarchelp/pages/provider/hospital/InpatientsScreen.tsx` — replace the inner table with nested `Accordion` rows using the shared section-accordion classes.
