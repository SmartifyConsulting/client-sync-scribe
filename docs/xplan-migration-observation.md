# Xplan migration observation — 18 November 2026

Status: CSV downloaded and loaded into the live Elysian preview; no import performed. Mapping corrections verified locally against the downloaded file.
This records a manual browser observation. It is not an implemented Companion adapter.

## Observed export journey

1. Existing signed-in Masthead Xplan session.
2. Clients > Search > Result (`/factfind/search/result?role=client`).
3. List reports three visible records and no next page.
4. CSV button above results is enabled. No rows were checked.
5. Clicking CSV displays: “A CSV report generated asynchronously in the background. A message will be sent to you when it has been completed and ready for download. You will be notified by the bell at the top right hand corner.”
6. A browser alert must be dismissed using the browser dialog API. The initial accessibility observations did not reliably expose that blocking alert.
7. The Notifications bell opens a **separate browser window/tab**, rather than a drawer in the source client-list tab. Detect the new Xplan tab at `/home/usermsg?login_role=user`.
8. Its message subject is `csv File Generated`; its body confirms `Client List CSV` has been generated. Follow its `Download File` link (`/store/transient/clientlist.csv?fileid=...`); the file ID is dynamic and must not be hardcoded.
9. Download verified at the user's local Downloads/clientlist.csv path. Parsed count is three records, with 22 headings. Do not commit the actual CSV or client values.

## Selection and temporary table configuration

- Open the result heading's gear (`config_button`), then `Temp. Table Config`.
- Observe checkbox state before setting it. User requested all available columns and all client records selected; previously unticked Skype and the second DOB variant were checked. All other available column boxes were already checked. `Save Current Config` was left unchecked; applied with `Ok`.
- In results iframe `search_frame`, set Select All only when unchecked. The verified confirmation is `All 3 clients are selected.` All three row boxes were checked.
- CSV was requested again after this selection/configuration change. Do not generate repeated exports just to poll completion.
- The retrieved CSV headings differ from the visible table: Address is present while Skype is absent. Automation must inspect the actual downloaded headers instead of assuming temporary table preferences define the file exactly. Confirm message recency/report identity before a production migration.

## Elysian upload rehearsal (verified live)

1. In authenticated broker Elysian session, My Clients (`/clients`).
2. Click `Import`, then `Select File` in `Import Clients`.
3. Choose downloaded `clientlist.csv` via file chooser.
4. UI confirms `Found 3 clients to import` and `Preview (3 clients)`.
5. **Stop before `Import Clients`**. No database import was submitted.
6. Live preview revealed unmapped DOB headings, surname-first names and Python-style address strings. The broker's own client was visibly already present in the Elysian list. This is an existing-record match requiring resolution, not permission to duplicate or overwrite it.

## Restricted mapping correction

Only Name/First Name (normalised to first and last name), Email, Phone, full-year Date of Birth, ID and Address map to existing client fields. No source category, adviser role, referrer, policy, commission or planning fields are imported through this correction.

`src/features/clients/lib/xplanImport.ts` detects the observed Xplan header pattern, reads the full-year birth-date column, preserves identity/phone text, normalises a single residential address without executing its source representation, and lists ambiguous values for review. CSV parser preserves quoted commas, escaped quotes and multiline fields. Unsupported columns remain explicit in preview.

Local verification using the actual downloaded sample: 3 rows, 3 parsed birth dates, 3 separated names and 3 normalised addresses; no mapping warnings. Three synthetic regression tests passed. This does not prove duplicate handling or the database import itself; neither has been implemented/verified as part of this rehearsal.

## Requested connection setup (not implemented)

The user requested this migration as the first setup process after a broker successfully connects Xplan credentials in Elysian. Desired sequence: authenticate, verify broker scope, select/export, await message/download, preview required fields, resolve duplicates, import, reconcile. This document is evidence for that work; there is no automatic connection-triggered migration yet. Credentials alone do not prove export permissions or satisfy OTP requirements.

## Candidate mappings from visible list headings

| Observed source | Candidate Elysian destination | Handling needed |
| --- | --- | --- |
| Name | Full/display name | Displayed as surname, given name; do not import unchanged as given-name-first without review. |
| First Name | First name | Explicit field; preferred over guessing from full name. |
| Preferred Name | Preferred name | Current basic importer has no dedicated destination; retain separately in preview. |
| Suburb | Address suburb | Not a full physical address; current importer has no suburb mapping. |
| Date of Birth (twice) | Date of birth | Duplicate heading observed. Compare values by column position; flag conflicts rather than overwrite. |
| Phone | Phone | Preserve leading zeros and international prefixes as text. |
| Email / SMS | Email/contact fields | Combined UI heading; inspect actual CSV structure before selecting a destination. |
| Category | Source client category | Categories include Client and AAA Client; do not equate category with lead stage or active/inactive status. |
| Adviser | Owning/assigned adviser | Match authenticated Elysian broker; never assign ownership from free text alone. |
| ID | Identity/passport number | Visible values are identity numbers, not Xplan record keys. Preserve as text. |
| Primary Referrer | Referrer relationship | Requires reviewed matching to an existing referrer. |
| Secondary Adviser and specialist adviser roles | Adviser relationships | Current basic importer does not preserve these links. |

Record links expose a distinct Xplan record reference in the client navigation action. Confirm whether an export column can supply it before implementing repeat-import matching. Do not substitute the identity number.

## Requirements before automation/import

- Confirm CSV report selection scope and row count from the downloaded report; three visible results do not prove three exported rows.
- Verify broker/account scope each run. The observed filter labels show All Users and All Groups; enforce authorised scope rather than copying these defaults for every broker.
- Parse CSV correctly, including quoted commas, line breaks and duplicate headings.
- Show every source column, mapped destination and unsupported field in a preview.
- Compare with existing Elysian records before creating anything; shared email alone is not a unique person identifier.
- Keep the broker's own client record visible for explicit inclusion/exclusion review.
- No financial, policy, document or note migration is demonstrated by this list export.
- Stop at login/OTP or unavailable export permission; do not record passwords, OTPs or client identity values in adapter diagnostics.
- Build asynchronous report polling, download capture and repeat-import safeguards only after the sample CSV and reviewed design are available.

## Existing importer correction

Git commit `b11cbd15` removes generic policy/insurance/membership numbers from automatic medical-aid-number mapping, warns about unmapped spreadsheet columns, and narrows the AI extraction instruction. Build and focused checks passed. Live frontend/backend deployment remains unverified.
