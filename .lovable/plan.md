

# Updated Plan: Standardize Field Styling + Rename "My Doctors" + Patient Profile Banner

The profile banner with avatar upload was already added in the previous implementation. However, the user reports the profile picture is not visible. This update ensures it renders correctly.

## 1. Ensure Patient Profile Picture Is Visible

**File:** `src/components/patients/PatientDetailsEditor.tsx`

The `ProfileBanner` component exists (line 358-401) and is rendered in both view and edit modes. However, the avatar may not display if:
- The `avatar_url` in the `profiles` table is null (no photo uploaded yet) — the fallback initials show instead
- The banner only renders when `isSelfService` is true

**Fix:** Ensure the avatar is always prominently visible by:
- Making the avatar larger (h-20 w-20 instead of h-16 w-16) so it's clearly visible
- Adding a visible camera icon badge (not just on hover) to prompt users to upload a photo when none exists
- Showing a "Tap to add photo" hint text below the avatar when no photo is set

## 2. Rename "My Doctors" to "My Healthcare Providers"

Already completed in the previous implementation — verified in current code (lines 454, 707).

## 3. Standardize ViewField to Match MyPractice Field Style

Already completed — `ViewField` now uses `Label` + disabled `Input`.

## 4. Standardize Edit Mode Field Wrappers

Already completed — spacing changed to `space-y-1.5`, `text-xs` removed from Labels.

## Remaining Work

Only item 1 needs implementation. The profile banner exists but the avatar needs to be more prominent and discoverable.

## Files Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Make avatar larger, add visible upload prompt when no photo exists |

