

# Add Icons, Round Tables, Patient List Spacing, Restore Sidebar, Rename Vulas Card, Fix Greeting

## Summary
Six changes: add icons to Digital Signature and Voice Narration headers in My Practice, add DoctorRoundTables to the dashboard, increase patient list column spacing on mobile, restore the left sidebar for web/tablet views, rename "Total Vulas" to "Vula Vouchers", and keep the greeting on a single line.

## Changes

### 1. Add icons to Digital Signature and Voice Narration accordion triggers
**File:** `src/pages/MyPractice.tsx`
- Digital Signature trigger: add `PenTool` icon inline, matching pattern of other accordion headers
- Voice Narration trigger: add `Volume2` icon inline

### 2. Add DoctorRoundTables to Dashboard
**File:** `src/pages/Dashboard.tsx`
- Mobile layout: place below RecentActivity with a "My Round Tables" heading
- Desktop/tablet layout: place below CompactTodoList in the right column

### 3. Shift patient list columns further right on mobile
**File:** `src/pages/Patients.tsx`
- Increase padding on Last Seen and Since columns from `px-1` to `px-3` on mobile

### 4. Restore left sidebar for web and tablet views
**File:** `src/components/layout/AppLayout.tsx`
- Re-import `Sidebar` and render it for `md+` screens
- Add `md:ml-[210px]` offset to main content and footer

### 5. Rename "Total Vulas" to "Vula Vouchers"
**Files:** `src/pages/Dashboard.tsx`, `src/pages/patient/MyRewards.tsx`, `src/components/gamification/LollipopReport.tsx`
- Change all instances of `"Total Vulas"` to `"Vula Vouchers"` across the doctor dashboard stats card, patient rewards page, and lollipop report

### 6. Keep greeting and name on one line
**File:** `src/pages/Dashboard.tsx`
- Remove the `<span className="block">` wrapper around `displayName` so the greeting renders as a single line (e.g., "Good morning, Dr. Surname") instead of wrapping the name onto a second line
- Add `whitespace-nowrap` to prevent wrapping on narrow screens

Also check and fix any similar greeting pattern in the patient dashboard:
**File:** `src/pages/patient/PatientDashboard.tsx` (if applicable)

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/MyPractice.tsx` | Add PenTool and Volume2 icons to accordion triggers |
| `src/pages/Dashboard.tsx` | Add DoctorRoundTables, rename "Total Vulas" to "Vula Vouchers", single-line greeting |
| `src/pages/patient/MyRewards.tsx` | Rename "Total Vulas" to "Vula Vouchers" |
| `src/components/gamification/LollipopReport.tsx` | Rename "Total Vulas" to "Vula Vouchers" |
| `src/pages/patient/PatientDashboard.tsx` | Single-line greeting if applicable |
| `src/pages/Patients.tsx` | Increase mobile column padding from px-1 to px-3 |
| `src/components/layout/AppLayout.tsx` | Restore Sidebar for md+ screens with ml offset |

