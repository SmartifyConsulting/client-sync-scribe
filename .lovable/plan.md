## Plan

1. **Dashboard To-Do grouping**
   - Update the dashboard To-Do widget so date buckets contain nested patient groups:
     ```text
     This week
       Sharon Kennedy
         Review Invoice
         Review Medical Certificate
         Review Prescription
     ```
   - Keep the top date bucket expanded by default and green/white.
   - Keep patient sub-groups collapsed by default inside each date bucket.
   - Reuse the same task row rendering/actions already used in the dashboard list.

2. **Recent Activity links**
   - Change Recent Activity so the activity title/type, e.g. **Session completed**, **Document generated**, **Task completed**, is the clickable link.
   - Render the patient/doctor name as plain text with the sample badge where applicable, not as the hyperlink.

3. **Patient alphabet strip**
   - Reduce the A-Z letter strip font by one size.
   - Darken the letter borders from the current light grey to a darker grey.
   - Keep the letters unshaded by default and only shade on hover/active state.

4. **Universal accordion spacing and headers**
   - Strengthen the shared accordion styling so there is clear padding between every green header row and its sub-text/content.
   - Apply this consistently to dashboard To-Dos, My Tasks, My Sessions, Documents, My Practice, and Patient Personal/Medical Information.
   - Make My Practice and Patient Personal/Medical Information accordion rows green with white text in both open and collapsed states.
   - Separate green rows with thin white divider lines.

5. **My Practice About Me AI**
   - Remove the visible **Generate with AI** button from About Me.
   - Keep the secure `generate-about-me` function as the generation backend.
   - Auto-generate the About Me synopsis once for new doctors after sign-up / first profile setup when `about_me` is empty.
   - Save the generated text to the profile so it does not regenerate again after that.
   - Leave the About Me text area editable and saveable after generation.

6. **Doctor nav: My Profile after Home**
   - Add **My Profile** to the doctor desktop sidebar immediately after **Home**.
   - Point it to the doctor’s own patient-profile view without requiring profile switching.
   - Add the matching mobile bottom-nav entry if space/pattern allows, preserving SOS visibility.

## Technical notes

- Files to update include `CompactTodoList`, `RecentActivity`, shared accordion styling, `Patients`, `MyPractice`, `PatientDetailsEditor`, and the doctor navigation components.
- I’ll verify the final UI on the dashboard and My Practice/Profile screens after implementation.