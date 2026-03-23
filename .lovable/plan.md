

# Plan: Reorganize My Practice & Settings Fields

## Changes

### 1. Move Language from Settings to My Practice (under Mobile Number)
- In `src/pages/MyPractice.tsx`, add the `LANGUAGES` constant and a Language select field after the Mobile Number field in the Personal Information frame
- Add auto-guess logic: when the country code changes, auto-set the language based on a mapping (e.g., `+27` → `af` or `en`, `+49` → `de`, `+33` → `fr`, etc.)
- The language field remains manually overridable
- In `src/pages/Settings.tsx`, remove the Language select from the Preferences tab (lines ~434-440)

### 2. Move Specialty next to First/Last Name (same row)
- Currently Specialty is in its own full-width row below the 2-column grid (lines 504-510)
- Move it into the same `grid` row as First Name and Last Name, making it a 3-column grid: First Name | Last Name | Specialty

### 3. Rename "Practice Details" to "Practice Information"
- Line 518: Change the heading text from "Practice Details" to "Practice Information"

### 4. Move Digital Signature from Settings to My Practice
- Cut the entire Digital Signature frame (Settings lines 537-583) including its constants (`SIGNATURE_FONTS`, `SIGNATURE_COLORS`), state variables (`sigFormData`, `savedStatus`, debounce logic), and helper functions (`getSignatureFontFamily`, `getSignatureColor`)
- Paste into `MyPractice.tsx` as a new section frame below Practice Information (after the partners section, before the closing of the practice tab)
- Add the same auto-save debounce logic for signature fields
- Remove all signature-related code from Settings.tsx

## Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Add Language field with auto-guess, move Specialty to name row, rename heading, add Digital Signature section |
| `src/pages/Settings.tsx` | Remove Language field, remove Digital Signature section and related constants/state |

