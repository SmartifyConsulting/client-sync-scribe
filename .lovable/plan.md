

# Dashboard & Patient List Mobile/Tablet Refinements

## Summary
Six changes: hide alphabet bar on mobile, collapse Recent Activity and To-Do List by default, reduce Today's Briefing fonts, show appointment count under date on T/W, shrink briefing headings and play controls on all views.

## Changes

### 1. Hide horizontal alphabet bar on mobile
**File:** `src/pages/Patients.tsx`
- Add `hidden md:flex` to the alphabet jump bar container (line 777) so it only shows on tablet and desktop

### 2. Collapse Recent Activity by default
**File:** `src/components/dashboard/RecentActivity.tsx`
- Wrap the component content in a `Collapsible defaultOpen={false}` with a primary-colored header trigger (matching the existing card pattern)

### 3. Collapse To-Do List by default
**File:** `src/components/dashboard/CompactTodoList.tsx`
- Wrap the component in a `Collapsible defaultOpen={false}` with primary-colored header trigger

### 4. Reduce Today's Briefing font sizes on mobile
**File:** `src/components/dashboard/TodaysBriefing.tsx`
- Title (line 474): change `text-lg` to `text-xs md:text-lg`
- Subtitle (line 475-477): change `text-sm` to `text-[10px] md:text-sm`

### 5. Show appointment count under date on Tablet and Web
**File:** `src/components/dashboard/TodaysBriefing.tsx`
- Split the subtitle into two lines on `md:` screens: date on first line, "X of Y appointments completed" on second line
- On mobile keep it single line (already compact from change 4)

### 6. Shrink play controls across all viewports
**File:** `src/components/dashboard/TodaysBriefing.tsx`
- Reduce all play control buttons: `h-6 px-1.5` on mobile, `md:h-7 md:px-2` on tablet/desktop (down from current h-7/h-9)
- Reduce icons to `h-2.5 w-2.5 md:h-3 md:w-3` (down from h-3/h-4)
- Reduce segment indicator text to `text-[8px] md:text-[10px]`
- Reduce nav arrows (ChevronLeft/Right) to `h-6 w-6 md:h-8 md:w-8`
- Narrate button: same compact sizing `h-6 px-1.5 md:h-7 md:px-2`

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Patients.tsx` | Hide alphabet bar on mobile |
| `src/components/dashboard/RecentActivity.tsx` | Wrap in collapsible, collapsed by default |
| `src/components/dashboard/CompactTodoList.tsx` | Wrap in collapsible, collapsed by default |
| `src/components/dashboard/TodaysBriefing.tsx` | Smaller fonts, split date/count, shrink all play controls |

