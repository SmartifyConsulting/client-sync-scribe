

# Narration Skip, Button Styling, Collapsed Defaults, Card Heights, and Round Tables as Card

## Summary
Five groups of changes: segment-based narration with skip controls, restored button styling for mobile, default-collapsed overview sections, equalized dashboard card heights, and restyled "My Round Tables" as a card matching "Recent Activity" — collapsed by default.

## Changes

### 1. Segment-based narration with skip controls
**File:** `src/components/dashboard/TodaysBriefing.tsx`
- Replace single-audio narration with per-appointment segments
- Add skip-forward and skip-back buttons
- Show segment indicator (e.g., "2 of 4 — Patient Name")
- Auto-advance to next segment on completion

### 2. Restore Pause/Stop button styling — white text, mobile-friendly
**File:** `src/components/dashboard/TodaysBriefing.tsx`
- Pause and Stop buttons: `bg-white/20 text-white border-white/30 hover:bg-white/30`
- Mobile sizing: `text-[10px] h-7 px-2` scaling up to `md:text-xs md:h-9 md:px-3`
- Icon sizes: `h-3 w-3 md:h-4 md:w-4`

### 3. Default all collapsible sections to collapsed
**File:** `src/components/patients/PatientOverview.tsx`
- Change `defaultOpen={true}` to `defaultOpen={false}` on all four sections: Allergies, Conditions/Diagnoses, Medications, Symptoms

### 4. Equalize dashboard stats card heights
**File:** `src/components/dashboard/StatsCard.tsx`
- Add `min-h-[80px] md:min-h-[100px]` to the card wrapper so all cards render at the same height

### 5. Restyle "My Round Tables" as a card matching "Recent Activity", collapsed by default
**File:** `src/pages/Dashboard.tsx`
- Wrap `DoctorRoundTables` in a card container styled identically to `RecentActivity`: `rounded-xl border border-primary bg-card shadow-sm` with a green header bar (`rounded-t-xl bg-primary px-4 py-3`) showing "My Round Tables" in white text
- Wrap the entire card in a `Collapsible` with `defaultOpen={false}` and a `ChevronDown` toggle on the header
- Apply to both mobile and desktop instances of the round tables section
- Remove the standalone `<h2>` heading since the card header replaces it

## Files Modified

| File | Changes |
|------|---------|
| `src/components/dashboard/TodaysBriefing.tsx` | Segment narration, skip controls, white button text, mobile button sizing |
| `src/components/patients/PatientOverview.tsx` | Change all 4 collapsible sections to `defaultOpen={false}` |
| `src/components/dashboard/StatsCard.tsx` | Add consistent min-height across all cards |
| `src/pages/Dashboard.tsx` | Wrap Round Tables in styled card with collapsed-by-default accordion |

