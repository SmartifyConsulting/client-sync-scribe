## Replace Section 3 of Patient Consent + add Emergency/SOS Disclaimer to HIPAA BAA

### 1. `src/pages/PatientConsent.tsx` — replace Section 3 body (lines 39–61)

Keep heading `<h2>3. EMERGENCY DISCLAIMER - MANDATORY ACKNOWLEDGMENT</h2>` exactly as-is. Replace all paragraphs and lists currently under it with the new SOS disclaimer copy below.

### 2. `src/pages/BusinessAssociateAgreement.tsx` — add new SOS / Emergency Disclaimer section

Insert a new `<h2>SOS and Emergency Functionality – Disclaimer and Limitation of Liability</h2>` section in the BAA, placed immediately before the existing closing/contact section so it falls at the end of the substantive clauses. Same body content as Patient Consent.

### Shared body content (rendered as JSX inside `LegalDocLayout`)

- `<p>` — The SOS functionality provided within this application is intended to assist users in contacting designated emergency contacts and, where available, emergency response services.
- `<p>` — The Company makes reasonable efforts to ensure the reliability and availability of the SOS feature; however, the Company does not warrant or guarantee:
- `<ul>`:
  - successful transmission or receipt of SOS alerts, calls, messages, or location information;
  - uninterrupted or error-free operation of the SOS functionality; or
  - the availability, response, or actions of emergency contacts, emergency responders, telecommunications providers, or other third parties.
- `<p>` — The effectiveness of the SOS feature may be impacted by factors beyond the Company's reasonable control, including but not limited to:
- `<ul>`: network or internet availability; device functionality or battery level; GPS or location accuracy; user permissions or device settings; third-party system outages or failures; environmental or technical conditions.
- `<p>` — The application is not a substitute for direct access to emergency services or professional medical, security, or emergency assistance. Users should contact the relevant emergency services directly where possible.
- `<p><strong>` — To the fullest extent permitted by applicable law, the Company shall not be liable for any loss, injury, damage, delay, failed communication, inability to obtain assistance, or other claim arising from or related to the use of, or inability to use, the SOS functionality.
- `<p>` — By using the application, users acknowledge and accept these limitations.

### Out of scope

- No changes to Terms & Conditions, routing, DB, or other clauses.
- No styling changes — both files already use `LegalDocLayout` which auto-builds the TOC from `<h2>` headings, so the new BAA section will appear in its TOC automatically.