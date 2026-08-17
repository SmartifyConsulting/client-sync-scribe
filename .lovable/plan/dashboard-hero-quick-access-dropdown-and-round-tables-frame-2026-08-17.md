# Dashboard hero, Quick Access dropdown and Round Tables frame

## What changes

1. **Move the profile hero to the Dashboard**
   - The banner card currently at the top of My Holarchy (avatar with "Change photo", greeting + date, Vulas counter, Upcoming Appointments, Calendar / Record Task buttons) moves to My Dashboard (`/my-dashboard`) as the top hero card, replacing the current plain greeting block.
   - It is removed from My Holarchy so it is not duplicated. The "Help us care for you better" completion banner stays where it is.
   - Calendar / Record Task buttons navigate to the patient admin section instead of switching tabs in place.

2. **Quick Access becomes a dropdown**
   - Instead of a grid panel of tiles, Quick Access becomes a single compact dropdown button in the dashboard hero header ("Quick access"), listing: My Documents, Lab Results, My Tasks, My Admissions.
   - My Round Tables is removed from the list.

3. **My Round Tables frame**
   - The space vacated by the Quick Access panel gets a "My Round Tables" frame showing the patient's round tables (reusing the existing round-table listing), with an empty state and a link through to the full round table view.

4. **Visual polish**
   - Consistent card treatment: rounded-xl, subtle border/shadow, tighter section headers with icon chips, aligned grid so the main column and right rail line up.
   - Hero given a soft gradient surface using existing tokens (no new colours), clearer Vulas block, and improved spacing/hierarchy across panels.
   - Preview/locked panels keep their greyed-out state so the system-admin review still shows what is live vs preview.

5. **Better photo-upload errors**
   - Validate before upload: reject non-image files and files over 5 MB with a clear message ("Please choose a JPG or PNG under 5 MB").
   - Map failure causes to plain-language toasts: not signed in / no linked record, storage permission denied, file too large, network offline, and a generic fallback that still shows the underlying reason.
   - Show a success toast on completion (unchanged) and always clear the file input so the same file can be retried.

## Technical notes

- Extract the banner JSX from `src/features/patients/components/PatientDetailsEditor.tsx` (`ProfileBanner`) into a reusable `src/components/dashboard/PatientHeroCard.tsx` that fetches its own patient record, avatar, Vulas count and upcoming appointments; render it at the top of `src/pages/MyPersonalDashboard.tsx` and delete the in-editor banner usage.
- Quick Access uses the existing shadcn `DropdownMenu`; tiles array trimmed (Round Tables entry removed).
- Round Tables frame reuses the existing patient round-table query/component used by `src/pages/patient/PatientRoundTable.tsx`.
- Upload error handling lives in the extracted hero component's `handleAvatarUpload`.
- No schema or RLS changes.
