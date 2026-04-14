

# Plan: Translate Briefing Display Text & Wrap Date on Mobile

## 1. Translate Today's Briefing displayed text to preferred language

**File:** `src/components/dashboard/TodaysBriefing.tsx`

Currently, the briefing card displays content in English (labels like "Last session:", allergy info, prescription text, round table notes, etc.). Translation only happens when the user clicks "Narrate". The displayed text should also be translated based on the doctor's `preferred_language`.

**Changes:**
- Add state for translated appointment data (`translatedAppointments`)
- On component mount (or when appointments load), fetch the user's `preferred_language`
- If non-English, call the `translate-text` edge function to translate the key display strings: `lastSessionSummary`, `allergies`, `lastPrescription`, linked doctor specialties, and round table note content
- Use the translated versions in the rendered JSX
- Show a subtle loading indicator while translating
- The "No appointments" and "No previous session notes" static strings should also be translated

## 2. Wrap date to next line on mobile in dashboard greeting

**File:** `src/pages/Dashboard.tsx` (line 276-278)

Currently:
```
Here's what's happening with your practice today, 14 April 2026
```
All on one line. On mobile (390px) this is too long.

**Fix:** Split into two elements — the sentence on one line, the date on the next line for mobile only:
```html
<p class="...">
  Here's what's happening with your practice today
  <span class="block md:inline">, {formattedDate}</span>
</p>
```
Using `block md:inline` makes the date wrap to the next line on mobile but stay inline on tablet/desktop.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/dashboard/TodaysBriefing.tsx` | Auto-translate displayed briefing content to preferred language |
| `src/pages/Dashboard.tsx` | Wrap date to next line on mobile greeting subtext |

