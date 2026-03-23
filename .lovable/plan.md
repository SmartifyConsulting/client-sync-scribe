

# Multi-Feature Update Plan

## 1. Doctor Ratings in Notification Window (for Patients)
**Problem:** Patients can only rate doctors from the Session detail page after completion. They should be able to rate from notifications too.

**Solution:**
- Add a notification type `session_completed` to the `NotificationList` in `src/pages/Notifications.tsx`
- When a session completes, create a notification for the patient with `reference_id` pointing to the session
- In `NotificationList`, render a star rating inline for `session_completed` notifications (import `StarRatingDialog`)
- Add a "Rate Visit" button that opens the `StarRatingDialog` component
- After rating, mark the notification as read

**Files:** `src/pages/Notifications.tsx`, `src/pages/Sessions.tsx` (trigger notification on session end)

---

## 2. Patient Document Sending (Send Arrow Logic)
**Problem:** Patients cannot send documents. The "Review and Send" task label is doctor-only; patients should see just "Send". If a doctor already sent a document, the patient's send arrow should be greyed out.

**Solution:**
- In `src/pages/patient/PatientDocuments.tsx`, add a Send button (green arrow) for each document record
- Check `email_sent_at` on the document: if already sent, show greyed-out arrow; if not, show green arrow that patients can click to send
- Rename task type `document_review` display label to "Send document" for patients in `PatientTasks.tsx`
- In `src/components/dashboard/CompactTodoList.tsx` and `src/pages/TodoList.tsx`, conditionally show "Send document" instead of "Review & send document" for patient-role users

**Files:** `src/pages/patient/PatientDocuments.tsx`, `src/pages/patient/PatientTasks.tsx`, `src/pages/TodoList.tsx`, `src/components/dashboard/CompactTodoList.tsx`

---

## 3. Compact Document Record Listing
**Problem:** Document records in the patient document list take up too much space with header-sized font.

**Solution:**
- In `src/pages/patient/PatientDocuments.tsx`, reduce the document card sizing:
  - Change `font-medium text-foreground` on document names to `text-sm font-medium`
  - Reduce card padding from `py-4` to `py-2.5`
  - Reduce icon container from `h-10 w-10` to `h-8 w-8`
  - Make the overall card more compact

**File:** `src/pages/patient/PatientDocuments.tsx`

---

## 4. Total Moolas Icon Consistency (Green M)
**Problem:** The Total Moolas card in My Rewards uses `moolas-logo.png` (imported differently) instead of the consistent green M (`moola-symbol.png`) used throughout the app.

**Solution:**
- In `src/pages/patient/MyRewards.tsx`, replace `import moolasLogo from "@/assets/moolas-logo.png"` with `import moolaSymbol from "@/assets/moola-symbol.png"` and update the Total Moolas card to use `moolaSymbol`

**File:** `src/pages/patient/MyRewards.tsx`

---

## 5. Partner App Logo Upload + RLS Fix
**Problem:** (a) Logo field is a URL input instead of file upload. (b) Insert fails with RLS violation because the `moola_partner_apps` table uses `has_role(auth.uid(), 'admin')` but the insert may not be passing the right data.

**Solution:**
- **RLS fix:** The existing policy uses `FOR ALL` which should cover INSERT. The issue is likely that the insert is casting to `any` and may be missing required fields or the admin role check is failing. Add a storage bucket or use existing `logos` bucket for partner app logos.
- **Logo upload:** In `src/pages/admin/GamificationAdmin.tsx`, replace the Logo URL text input with a file upload input. Upload the file to the `logos` storage bucket under a `partner-apps/` prefix, get the public URL, and use that as `logo_url`.
- **RLS investigation:** The `FOR ALL` policy with `has_role` check should work. The error likely stems from the user not having the admin role assigned. Will ensure the insert passes correct fields.

**File:** `src/pages/admin/GamificationAdmin.tsx`

---

## 6. Chronic Medication Sync with Current Medications
**Problem:** The "Chronic Medication" field in Medical Information is just a boolean toggle. It should list actual chronic medications and sync with the prescriptions/overview.

**Solution:**
- In `PatientDetailsEditor.tsx` Medical Information tab, replace the simple checkbox with:
  - Keep the `is_chronic` toggle
  - When chronic is enabled, fetch active prescriptions from the `prescriptions` table for this patient and display them as the current chronic medication list
  - Add a text field for manually listing chronic medications (add a `chronic_medications` text column to the `patients` table via migration)
  - When a new chronic prescription is created, auto-update this field
- In `PatientOverview.tsx`, display the chronic medications list from the same source
- Ensure Blood Type, Allergies, and Chronic Medication all use `ViewField` with proper labels in view mode (they already do for Blood Type and Allergies, but Chronic Medication just shows "Yes/No" — update to show the actual medication names)

**Files:** `src/components/patients/PatientDetailsEditor.tsx`, `src/components/patients/PatientOverview.tsx`
**Migration:** Add `chronic_medications text` column to `patients` table

---

## 7. Blood Type, Allergies, Chronic Medication as Field Labels
**Problem:** These need to be displayed with proper field labels in the Medical Information frame.

**Solution:** They already use `ViewField` in view mode (lines 542-553). Confirm and ensure consistency. The Chronic Medication field currently shows "Yes - Chronic" or "No" — update to show the actual medication list text instead.

**File:** `src/components/patients/PatientDetailsEditor.tsx`

---

## 8. General Practitioner: Own Frame + Search
**Problem:** GP is currently inside the Medical Insurance frame. It should be in its own frame between Insurance and Pharmacies. Also needs a search feature (search referral doctors).

**Solution:**
- In both view and edit modes of `PatientDetailsEditor.tsx`, move "General Practitioner" out of the Medical Insurance frame into its own `sectionFrame` positioned between Insurance and Pharmacies
- Add a search/autocomplete for the GP field that searches the `referral_doctors` table to suggest existing doctors
- Use a combobox-style input with dropdown suggestions

**File:** `src/components/patients/PatientDetailsEditor.tsx`

---

## Technical Details

### Database Migration
```sql
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS chronic_medications text;
```

### Files Modified Summary
| File | Changes |
|------|---------|
| `src/pages/Notifications.tsx` | Add star rating for session_completed notifications |
| `src/pages/patient/PatientDocuments.tsx` | Add send button, compact card sizing |
| `src/pages/patient/MyRewards.tsx` | Use moola-symbol.png for Total Moolas |
| `src/pages/admin/GamificationAdmin.tsx` | File upload for partner app logo |
| `src/components/patients/PatientDetailsEditor.tsx` | GP own frame with search, chronic meds list, label fixes |
| `src/pages/TodoList.tsx` | Patient sees "Send" not "Review & Send" |
| `src/components/dashboard/CompactTodoList.tsx` | Same label fix |
| `src/pages/Sessions.tsx` | Create notification for patient on session end |

