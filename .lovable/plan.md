

# Fixes: Healthcare Providers Tab, Voice Narration, Round Tables Route, Page Heading

## 1. Move "My Healthcare Providers" Tab — Doctor's Holarchive
**File:** `src/components/patients/PatientDetailsEditor.tsx`

Currently, for doctors viewing their own Holarchive (`isSelfService && isDoctor`), the tab order is: Personal → Medical → Overview → Sessions → Documents → Healthcare Providers → Round Table → Practice.

The request is to move "My Healthcare Providers" to appear right after "Medical Overview". New order:
- Personal Information
- Medical Information  
- Medical Overview
- **My Healthcare Providers** (moved up)
- My Sessions
- My Documents
- My Round Table
- My Practice

Update both view-mode (line 446-456) and edit-mode (line 713-722) tab lists to reorder the triggers.

## 2. Fix Narration Voice Not Changing + Sample Text
**File:** `src/pages/MyPractice.tsx`

**Root cause:** The `Select` `onValueChange` handler (line 818-823) updates the database but does NOT update the local `profile` state. Since the Select is controlled by `profile?.narration_voice`, it snaps back to the old value.

**Fix:** After the DB update, call `useProfile`'s refresh or update local state. Since `useProfile` doesn't expose a setter, add an optimistic local state for the voice:
- Add `const [localVoice, setLocalVoice] = useState(profile?.narration_voice || "nova")` 
- Sync it when profile loads
- In `onValueChange`: set `localVoice` immediately, then update DB
- Use `localVoice` for the Select value and the sample voice playback

**Sample text:** Change from the generic English text (line 846) to:
`"Welcome to Holarch Health - your 360 degree healthcare holarchy"`

**Primary language narration:** The `narrate-briefing` edge function uses OpenAI TTS which doesn't have a language parameter — it auto-detects from text. The sample text is English so it will speak English. No edge function change needed.

## 3. My Round Tables Shows Practice Screen
**File:** `src/components/layout/Sidebar.tsx`

The sidebar link is `{ to: "/practice?tab=roundtables" }`. The MyPractice page removed the tab trigger but should still render Round Tables content when `?tab=roundtables` is present.

**Check:** Look at how MyPractice handles the `tab=roundtables` query param. The Tabs component uses `defaultValue="practice"` and there's no logic to read query params and set the active tab. The Round Tables tab trigger was removed, so there's no way to activate it.

**Fix:** In `src/pages/MyPractice.tsx`, read `searchParams.get("tab")` and if it equals `"roundtables"`, render the `DoctorRoundTables` component directly instead of the Tabs UI. This way the sidebar link works.

## 4. Rename Heading to "My Holarprac"
**File:** `src/pages/MyPractice.tsx` (line 516)
- Change `"My Practice"` to `"My Holarprac"`

## Files Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Reorder tabs: Healthcare Providers after Medical Overview |
| `src/pages/MyPractice.tsx` | Fix voice state, update sample text, handle roundtables query param, rename heading |

