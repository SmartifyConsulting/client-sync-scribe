

# UI & Search Fixes

## 1. Auto-Populate User Search (InviteUserDialog)

**File: `src/components/InviteUserDialog.tsx`**

The search currently requires clicking a button. Change to auto-search as the user types (debounced 300ms), same pattern as Patients.tsx. Replace the manual `handleSearch` with a `useEffect` that triggers on `searchQuery` changes when length >= 2. Remove the search button entirely and show results inline as user types.

The existing query `.or('full_name.ilike.%${searchQuery}%')` should work for partial matches like "Pierre" finding "Pierre Dubois". No role filter needed here since this is a general user invite.

## 2. Session Selection for Download

**File: `src/pages/Sessions.tsx`** (lines 1158-1177)

Currently the checkbox only shows when `session.audio_url` exists. Change logic:
- Show checkbox for ALL completed sessions
- Disable checkbox (grayed out) for sessions older than 7 days with a tooltip "Recording expired"
- Sessions without audio_url get a download of the session summary/transcript instead (or just skip the audio download gracefully)

## 3. More Terracotta Color Usage

### 3a. CompactTodoList Mic Button
**File: `src/components/dashboard/CompactTodoList.tsx`** (line 296)

Change the non-recording state from `bg-secondary hover:bg-secondary/90` to `bg-terracotta hover:bg-terracotta-dark` with `text-white` to match the dashboard header mic button.

### 3b. Calendar Patient Initials Badges
**File: `src/pages/CalendarView.tsx`** (line 406)

Change the patient initials circle from `bg-primary text-primary-foreground` to `bg-terracotta text-white`. This applies to both the grid view badges and the sidebar "Today's Schedule" badges.

Search for all instances of `bg-primary` used for initials in CalendarView and replace with `bg-terracotta`.

## Files Modified

| File | Change |
|------|--------|
| `src/components/InviteUserDialog.tsx` | Auto-search on type with debounce, remove manual search button |
| `src/pages/Sessions.tsx` | Show checkboxes on all completed sessions; disable for 7+ day old |
| `src/components/dashboard/CompactTodoList.tsx` | Mic button: `bg-secondary` → `bg-terracotta` |
| `src/pages/CalendarView.tsx` | Patient initials badges: `bg-primary` → `bg-terracotta` |

