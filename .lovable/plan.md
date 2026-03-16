

# Plan: Compact To-Do List Under Recent Activity

## Changes

### 1. Create `CompactTodoList` component (`src/components/dashboard/CompactTodoList.tsx`)
A slim, card-style component matching the Recent Activity card width and style:
- **Header**: Primary-colored bar with "To-Do List" title and a small record button (mic icon, orange circle)
- **Inline add**: Single row with text input + Add button (no large recording frame)
- **Two tabs only**: "Active" and "Completed" (no "All" tab)
- **Compact task rows**: Checkbox + title + priority badge + edit/delete icons, smaller padding (`py-2 px-3`)
- Voice recording logic reused from TodoList but triggered by the small mic button
- AI auto-processing still works after recording stops
- Max height with scroll for the task list (`max-h-64 overflow-y-auto`)

### 2. Update Dashboard layout (`src/pages/Dashboard.tsx`)
- Replace the full `<TodoList />` import with `<CompactTodoList />`
- Move it into the right column under `<RecentActivity />` so both share the same `lg:col-span-1` width:
```
<div>
  <RecentActivity />
  {isDoctor && <CompactTodoList />}
</div>
```
- Remove the separate full-width TodoList section at the bottom

### Files
| File | Change |
|------|--------|
| `src/components/dashboard/CompactTodoList.tsx` | New compact component |
| `src/pages/Dashboard.tsx` | Replace TodoList with CompactTodoList in right column |

