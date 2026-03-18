

# Doctor Dashboard Enhancements, MY RECORD Styling, Drawing Hide, Document Viewing

## 1. Doctor Rating & Moolas on Dashboard

**File: `src/pages/Dashboard.tsx`**

Add two new queries:
- **Average rating**: Query `visit_ratings` where `rated_user_id = user.id`, compute average
- **Doctor moolas**: Query `doctor_rewards` where `doctor_id = user.id`, sum `moolas_count`
- **Patient moolas**: Query the patient record linked to the doctor (via `patients.patient_user_id = user.id`), then query `gamification_config` visit rewards earned — or simpler: sum from the existing patient rewards system

Display in the stats grid:
- Replace one of the hardcoded stats cards (or add new ones) showing: Star Rating (avg out of 5), Doctor Moolas (Ⓜ), Patient Moolas (Ⓜ), Total Moolas (sum)
- The doctor should see combined moolas and be able to transfer them from a Moolas tab

**File: `src/pages/Profile.tsx`** — Add a "Moolas" tab to the doctor's profile with transfer functionality (similar to `MyRewards.tsx` patient transfer UI). Query both `doctor_rewards` and patient rewards tables, sum them, and allow transfers via `moola_transfers`.

## 2. Fix MY RECORD Styling — Remove Duplicate "ME", Change Colors

**File: `src/pages/Patients.tsx`** (lines 823–843)

- Change `bg-purple-100/60` header row to `bg-gray-100 dark:bg-gray-800/30` (light grey)
- Change `text-purple-700` to the logo red color `text-[#E53935]` (Holarc Red/terracotta)
- Change first ME badge circle from `bg-purple-200 text-purple-800` to `bg-[#E53935] text-white`
- **Remove** the second inline `ME` badge (line 842) — the `<span className="ml-2 ...">ME</span>` after the name
- Update hover colors and border from purple to match

## 3. Hide Drawing Functionality

**File: `src/components/sessions/SessionNotepad.tsx`**
- Remove the Draw toggle button and DrawingPad rendering — only show the text notepad

**File: `src/pages/PatientProfile.tsx`**
- Remove the "Drawing Pad" tab trigger (line 325–328)
- Remove the drawings `TabsContent` (lines 640–648)
- Remove `DrawingPad` import

## 4. Fix Document Viewing from Patient Profile

**File: `src/pages/Documents.tsx`**
- On mount, read `?view=` URL param via `useSearchParams`
- If a `view` doc ID is present, switch to "documents" tab and auto-open the document preview dialog (`setPreviewDocument`)
- Match the ID against the loaded `documents` array

**File: `src/pages/PatientProfile.tsx`** (line 599)
- The navigation `onClick={() => navigate(`/documents?view=${doc.id}`)}` is correct — the Documents page just needs to handle it

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add doctor avg rating query, doctor moolas + patient moolas queries, display in stats |
| `src/pages/Profile.tsx` | Add Moolas tab for doctors with combined balance & transfer |
| `src/pages/Patients.tsx` | Restyle MY RECORD: grey bg, red text/badges, remove duplicate ME badge |
| `src/components/sessions/SessionNotepad.tsx` | Remove Draw toggle & DrawingPad — text only |
| `src/pages/PatientProfile.tsx` | Remove Drawing Pad tab and content |
| `src/pages/Documents.tsx` | Handle `?view=docId` param to auto-preview a document |

