## Plan additions

### 7. Seed test connections (Jean ↔ Georgia)
- Look up the user IDs for **Georgia Adams** and **Jean Prodromos** (and the email `info@georgiaadams.co.za`) in `profiles` / `auth.users`.
- Insert a row in `doctor_patient_access` (or the equivalent connection table used by Patient List Mgmt) linking **Jean Prodromos** into **Georgia Adams**' patient list (active = true).
- Add **info@georgiaadams.co.za** to **Jean Prodromos**' linked-account / profile-switcher entries so testing can hop back to Georgia in one click. Exact table will be confirmed during exploration (likely `patient_profile_shares` or the profile-switcher table).

### 8. Vula counter top-aligned with "Vula" wordmark (all views)
- Wherever the Vula logo + count appear together (`PatientDetailsEditor`, doctor briefing widget, rewards/Holarchive headers), change the flex row from default/center alignment to `items-start`.
- Match the count's `line-height` and top padding to the cap-height of the "Vula" text in the logo so the digit's top edge lines up with the top of the word "Vula" (not the icon).
- Applies to mobile, tablet, and desktop.

### 9. Tablet — Vula logo + count placement
- On `md` breakpoint only, move the Vula logo + counter **below** the "What's happening" text block and **center-align** it (`flex-col items-center` wrapper with the Vula pair as the last child on tablet).
- Desktop layout (right-aligned in header) and mobile layout (centered, already shipped) remain unchanged.

### 10. Accordion frame thickness parity (Personal & Medical Info)
- Inspect the **Emergency Contacts** accordion in `PatientDetailsEditor` to capture its exact border utility (likely `border-2 border-primary/teal`).
- Apply the same border width + color tokens to the **Personal Information** and **Medical Information** accordion frames so all three sections look identical in frame thickness.
- No content / spacing changes — only the border utility on the outer accordion wrappers.

## Technical notes
- Seeding (item 7) will use the `supabase--insert` tool after a `supabase--read_query` confirms the correct user IDs and the right connection table — no migration required.
- Items 8–10 are pure presentation changes scoped to `src/features/patients/components/PatientDetailsEditor.tsx` and any shared Vula widget component; no business logic touched.