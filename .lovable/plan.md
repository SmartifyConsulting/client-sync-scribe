

# Updated Plan: Doctor Rewards Parity + AI Task Approval + Moola Symbol

## Three Changes

### 1. Moola Symbol — Use Uploaded Icon
The attached image shows the official Moola symbol: a green circle with a stylized "M" inside. This will be copied into the project and used as the Moola icon everywhere, replacing the current CSS-styled "M" circle.

**Steps:**
- Copy `user-uploads://image-28.png` → `src/assets/moola-symbol.png`
- Update `MoolaLogoBadge` in `src/components/gamification/LollipopDisplay.tsx` to render this image instead of the CSS "M" circle
- Size variants (sm/md/lg) will use the image at appropriate dimensions
- Update `src/pages/Dashboard.tsx` to use this symbol prominently on the Moola stats card via `imageUrl` prop (already supported by `StatsCard`)
- Update `src/pages/doctor/DoctorRewards.tsx` to use this symbol in the header/balance display

### 2. Doctor Rewards — Add Patient-Style Rewards View
Below the existing moola aggregation dashboard in `DoctorRewards.tsx`, add the same rewards sections patients see:
- Milestones progress, streaks, recent rewards history
- Reuse hooks and components from `MyRewards.tsx`
- Doctor's existing breakdown (Doctor/Patient/Combined) stays at top

### 3. AI Task Approval Workflow — No Auto-Complete
**Edge function (`process-todo-actions/index.ts`):** Change AI-executed tasks from `status: "completed"` to `status: "pending"` so they require manual approval.

**UI (`TodoList.tsx` + `CompactTodoList.tsx`):** Add an "Approve" button on AI-generated pending tasks (`is_auto_executed === true`). Clicking it marks the task as completed. AI tasks show a distinct approval icon until confirmed.

## Files to Modify

| File | Change |
|------|--------|
| `src/assets/moola-symbol.png` | Copy uploaded Moola icon |
| `src/components/gamification/LollipopDisplay.tsx` | Use Moola symbol image instead of CSS "M" |
| `src/pages/Dashboard.tsx` | Use Moola symbol as `imageUrl` on stats card |
| `src/pages/doctor/DoctorRewards.tsx` | Add patient-style rewards view below existing dashboard, use Moola symbol |
| `supabase/functions/process-todo-actions/index.ts` | Change auto-executed tasks to `status: "pending"` |
| `src/pages/TodoList.tsx` | Add approve button for AI tasks |
| `src/components/dashboard/CompactTodoList.tsx` | Add approve button for AI tasks |

