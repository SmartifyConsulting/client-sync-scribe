## 1. SOS nav item — white font by default

`src/components/layout/Sidebar.tsx`: `danger` items render red text on transparent when inactive. Change the inactive state to a solid red background with white text (darker red on hover) so SOS / Hospital Portal / ER Portal always read white.

## 2. To-Do List patient groups — remove inner rounded frames

`src/components/dashboard/CompactTodoList.tsx`: drop `rounded-md border border-neutral-300 bg-card overflow-hidden` from the nested patient `<Accordion>` so patient rows sit flush inside the date-bucket frame, keeping only the `divide-y` separators.

## 3. Dummy data marker — bold orange test tube

Replace the "SAMPLE" text badge with a bold orange `TestTube` icon prefix before the name everywhere `isSamplePatient()` is used (patient list, patient header/profile, pickers). Add a shared `SampleMarker` component (orange icon + "Sample data" tooltip) so every surface matches.

## 4. Dr Buttons missing from referral doctor search

Verified cause: `profiles` has no policy letting one doctor read another doctor's row — SELECT policies cover only own profile, admins, patients of connected doctors, and access requests. The search therefore returns nothing for unconnected doctors, including Dr. Buttons.

Fix: add security-definer `public.search_doctor_profiles(_q text)` returning id, full_name, specialty, practice_number, doctor_number for doctor-role users matched on name/practice/doctor number, limit 10, execute granted to `authenticated`. `src/pages/ReferralDoctors.tsx` calls the RPC instead of querying `profiles` + `user_roles`.

## 5. Referrals sidebar filters don't work

Verified: `filtered` only matches `first_name last_name` against the query and requires an exact `specialty ===` match on saved referral rows.

Fix: match the search text case-insensitively across name, specialty, practice number, email and phone; make the specialty comparison case-insensitive with an alias map. Also surface directory matches from the new RPC when no saved referral matches, so a doctor like Dr. Buttons can be found and added straight from the filter results.

## 6. Physiotherapy specialty missing

Verified: Gianna Buttons' specialty is `Physiotherapist`, but `SPECIALTIES` in `ReferralDoctors.tsx` has no such entry (only `Physiatrist`). Add `Physiotherapist`, `Occupational Therapist`, `Dietitian`, `Chiropractor`, `Optometrist`, with "Physiotherapy" aliased to "Physiotherapist".

## 7. Hospital search bar — remove green frame

`src/components/doctor/HospitalAffiliations.tsx`: remove the primary focus ring on `CommandInput` (`focus-visible:ring-0 focus-visible:ring-offset-0 border-0`) so only the divider under the search row shows.

## 8. Template editor — highlighting still inserts raw HTML tags, no font controls

Verified: `TemplateSectionEditor` is a plain `<textarea>`; `applyFormatting` literally wraps the selection in `<b>`/`<i>`/`<u>` strings, and the toolbar only has bold/italic/underline/align/image — there is no font family or font size control anywhere.

Fix: convert the section editor to a `contentEditable` WYSIWYG surface that renders formatting visually (bold/italic/underline/alignment applied to the rendered text, HTML kept in state but never shown to the user), and add two toolbar dropdowns:
- Font family: the app's existing document fonts (Sora, Manrope, Arial, Times New Roman, Georgia, Courier New).
- Font size: 10–24 pt steps.
Both apply to the current selection, and to the whole section when nothing is selected. Existing templates containing raw tags render correctly since the same HTML is reused.

## 9. Template previews should show real values, not raw tokens

Verified: template previews render stored content as-is, so `[DoctorName]`, `[DoctorNumber]`, `[DoctorSignature]` appear literally, while resolution logic already exists in `fillDocumentPlaceholders` / `resolveDocumentPreviewContent` and is applied only to saved documents.

Fix: run the same resolution in every template preview surface (`TemplateForm`, `TemplateSectionEditor`, `HeaderFooterTemplateForm`, templates tab) using the signed-in doctor's profile — name, registration/practice number, practice details, and the stored signature via `renderSignatureHtml`. Patient-scoped tokens without context fall back to the existing quiet underscore placeholder instead of raw brackets.

## Technical notes

- One migration for `search_doctor_profiles` (SECURITY DEFINER, `set search_path = public`, execute granted to `authenticated`). No table or RLS changes.
- Everything else is presentation-layer only.
