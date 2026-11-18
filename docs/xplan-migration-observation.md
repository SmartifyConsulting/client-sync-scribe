# Xplan migration observation — 18 November 2026

Status: live list inspected; CSV requested; download not yet retrieved; no import performed.
This records a manual browser observation. It is not an implemented Companion adapter.

## Observed export journey

1. Existing signed-in Masthead Xplan session.
2. Clients > Search > Result (`/factfind/search/result?role=client`).
3. List reports three visible records and no next page.
4. CSV button above results is enabled. No rows were checked.
5. Clicking CSV displays: “A CSV report generated asynchronously in the background. A message will be sent to you when it has been completed and ready for download. You will be notified by the bell at the top right hand corner.”
6. Dismissed acknowledgement. Notification button did not visibly open a panel, including after a screenshot-confirmed click. Report availability and actual export contents remain unverified. Do not request another export simply because a download has not started.

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
