

# Fixes Plan

## 1. Reset Faith Akeno's Password
Faith Akeno is a **patient record only** — she has no user account in the system (no `patient_user_id`). There is no password to reset. She would need to be invited/registered as a user first. I will note this to you rather than make changes.

## 2. Sort Languages Alphabetically
**File: `src/pages/Profile.tsx`** (lines 71-100)
- Reorder the `LANGUAGES` array alphabetically by `name`.

## 3. Fix Voice Preview for Non-English Languages
**File: `src/pages/Profile.tsx`** (lines 843-844)
- The `narrate-briefing` edge function calls OpenAI TTS, which only supports English text well. The preview text is hardcoded in English.
- Fix: Generate language-appropriate sample text based on the selected language. Add a mapping of sample sentences per language code (e.g., French → "Bonjour, ceci est un aperçu de votre voix de narration MediPad.").

## 4. Remove Duplicate "Upload File" Button
**File: `src/components/documents/MediaCapture.tsx`** (lines 174-184)
- Remove the "Upload File" button and hidden file input from inside `MediaCapture`, since `PatientProfile.tsx` already has its own standalone "Upload File" button next to it.

## 5. Rename Lollipop → Moola in VisitCategoryDialog
**File: `src/components/sessions/VisitCategoryDialog.tsx`**
- Change "Award Lollipop?" → "Award Moola?"
- Change lollipop emoji 🍭 → Ⓜ️
- Change "Skip (No lollipop)" → "Skip (No moola)"
- Change button text "🍭 Award Lollipop" → "Ⓜ️ Award Moola"

## 6. Notification Bell Counter Already Exists
The notification bell in `Dashboard.tsx` and `PatientDashboard.tsx` already shows an unread count badge with `unreadNotifCount`. If it's not appearing, the issue is likely that there are no unread notifications matching the filter types. I will verify the query filters match actual notification types in the database.

### Files Modified
| File | Change |
|------|--------|
| `Profile.tsx` | Sort languages, add multilingual preview text |
| `MediaCapture.tsx` | Remove duplicate Upload File button |
| `VisitCategoryDialog.tsx` | Rename lollipop → moola |

