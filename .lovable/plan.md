

# UI Fixes: Edit Icons, Logo, Colors, Labels, Tasks Input + Calendar Compaction

## Summary
Eight targeted fixes across the patient mobile and desktop views: restore edit mode entry, increase Vula logo, apply gradient to Vula count, remove logo from Recent Rewards heading, rename mobile healthcare label, add voice+text task input, compact the calendar on mobile by 15%.

## Changes

### 1. Restore inline edit icon to enter edit mode
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In view mode (~line 1460), add a Pencil icon button to the heading rows of "Personal Information" and "Medical Information" tabs
- Each button calls `setIsEditing(true)` to re-enable edit mode, which currently has no trigger

### 2. Increase Vula Vouchers logo size by 30% in ProfileBanner
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Line 1136: Change `h-8` to `h-10` on the Vula Vouchers logo image

### 3. Apply blue-teal gradient to Vula count
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Line 1141 (ProfileBanner) and line 1403 (CompactBanner): Replace `text-primary` with `bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent`

### 4. Remove Vula Vouchers logo from "Recent Rewards" heading
**File:** `src/pages/patient/MyRewards.tsx`
- Line 436: Remove the `<img>` tag from the CardTitle, keep only "Recent Rewards" text

### 5. Rename "My Healthcare Providers" to "My H/Care Team" on mobile only
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In the mobile tab trigger (~line 1234) and mobile heading (~line 1903): use `isMobile ? "My H/Care Team" : "My Healthcare Providers"`
- Desktop/tablet sub-tab (~line 1352) keeps "My Healthcare Providers"

### 6. Add mic + text task input to My Tasks screen
**File:** `src/pages/patient/PatientTasks.tsx`
- Add a centered input area at the top of the task list with:
  - A microphone button (record → call `transcribe-audio` edge function → populate text field)
  - A text input field with placeholder "Type a task..."
  - A submit button to insert a new `todos` row with the patient's ID
- This appears on all views (mobile, tablet, desktop)

### 7. Compact the Calendar view on mobile by 15%
**File:** `src/pages/patient/PatientCalendar.tsx`
- Reduce padding and font sizes on mobile for a 15% more compact layout:
  - Week view day buttons: reduce `p-3` to `p-2`, day number from `text-lg` to `text-base`
  - Month view: reduce cell sizes with `aspect-[1/0.85]` on mobile instead of `aspect-square`, day circle from `h-7 w-7` to `h-6 w-6`, text from `text-sm` to `text-xs`
  - Card headers: reduce padding with `p-3` on mobile
  - Navigation buttons: slightly smaller with `px-1.5` on mobile
- Use responsive classes (e.g., `p-2 md:p-3`) to only affect mobile without changing tablet/desktop

## Technical Details

The edit mode trigger (`setIsEditing(true)`) exists but was orphaned when the ProfileBanner was redesigned — the old edit button was in the banner. Re-adding it as inline Pencil icons on tab content headers is the cleanest approach.

For the task mic input, we'll reuse the existing `transcribe-audio` edge function and a simple MediaRecorder flow similar to `useAudioRecording.ts`.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/patients/PatientDetailsEditor.tsx` | Restore edit icons, increase logo 30%, gradient Vula count, mobile label rename |
| `src/pages/patient/MyRewards.tsx` | Remove logo from Recent Rewards heading |
| `src/pages/patient/PatientTasks.tsx` | Add mic + text task input centered below heading |
| `src/pages/patient/PatientCalendar.tsx` | Compact mobile layout by 15% (padding, font sizes, cell dimensions) |

