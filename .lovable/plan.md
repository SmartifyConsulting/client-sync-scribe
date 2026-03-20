

# Plan: Dashboard UX Fixes & To-Do Improvements

## 1. Remove "M" (Manual) badge from to-do items
Remove the priority badge entirely from the compact to-do list — automated tasks already show a Sparkles icon, which is sufficient distinction.

**File**: `src/components/dashboard/CompactTodoList.tsx`

## 2. Increase silence detection timeout from 3s to 8s
**Files**: `src/components/dashboard/CompactTodoList.tsx`, `src/pages/TodoList.tsx`

## 3. Fix patient dashboard greeting flicker
Show nothing until profile is fully loaded, then render the complete greeting at once.

**File**: `src/pages/patient/PatientDashboard.tsx`

## 4. Move Doctor Rating & Total Moolas cards to end of stats row
Reorder: Total Patients → Appointments Today → This Week → Doctor Rating → Total Moolas

**File**: `src/pages/Dashboard.tsx`

## 5. Improve to-do list readability on dashboard
- Remove `truncate` from task titles so text wraps
- Increase max-height to `max-h-96`
- Increase task title text to `text-xs` (12px)

**File**: `src/components/dashboard/CompactTodoList.tsx`

## 6. Adjust dashboard layout: wider to-do, Recent Activity under Briefing only

Change the main content grid to a 5-column layout. Recent Activity sits below Today's Briefing in the same 3-column span, not full width.

```text
┌───────────────────┬────────────┐
│ Today's Briefing  │  To-Do     │
│ (3/5)             │  List      │
│                   │  (2/5)     │
├───────────────────┤            │
│ Recent Activity   │            │
│ (3/5)             │            │
└───────────────────┴────────────┘
```

**File**: `src/pages/Dashboard.tsx`
- Grid becomes `lg:grid-cols-5`
- Briefing + Recent Activity stack in `lg:col-span-3`
- To-Do List in `lg:col-span-2`

## Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/CompactTodoList.tsx` | Remove priority badge, increase silence timeout, improve readability |
| `src/pages/TodoList.tsx` | Increase silence timeout to 8s |
| `src/pages/Dashboard.tsx` | Reorder stats cards, restructure layout grid |
| `src/pages/patient/PatientDashboard.tsx` | Fix greeting flicker |

