

# Logo Update, To-Do List Enhancements, AI Task Indicator & Session Audio Playback

## 1. Update Logo Asset

Copy the uploaded `HolarcLogoLong-2.png` to `src/assets/holarc-logo.png` (replacing the existing file). All 6 files that import this asset will automatically use the new logo.

## 2. Increase Logo Sizes

**Navbar (Sidebar + MobileHeader)** — increase by 20%:
- `Sidebar.tsx`: `h-[52px]` → `h-[62px]`
- `MobileHeader.tsx`: `h-[42px]` → `h-[50px]`

**Sign-on pages** — increase by 30%:
- `Auth.tsx`: `h-[90px]` → `h-[117px]` (two occurrences)
- `ForgotPassword.tsx`: `h-[62px]` → `h-[81px]`
- `ResetPassword.tsx`: `h-[62px]` → `h-[81px]`
- `Landing.tsx`: `h-[52px]` → `h-[68px]` (also a public-facing page, increase by 30%)

## 3. Limit "Done" To-Do Items to 2 Weeks

**File: `src/components/dashboard/CompactTodoList.tsx`**

Filter completed todos to only show items completed within the last 14 days:

```typescript
const twoWeeksAgo = new Date();
twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

const filteredTodos = todos.filter((t) => {
  if (filter === "active") return !t.completed;
  // Only show completed items from last 2 weeks
  return t.completed && new Date(t.created_at) >= twoWeeksAgo;
});
```

Also add `completed_at` to the TodoItem interface and use it for the date check when available.

## 4. Add To-Do List to Doctor Nav

**File: `src/components/layout/Sidebar.tsx`**

Add a `CheckSquare` nav item after Sessions:
```typescript
{ icon: CheckSquare, label: "To-Do List", to: "/todos" },
```

The route already exists in `App.tsx` pointing to `TodoList.tsx`.

## 5. AI Diamond Icon for Auto-Generated Tasks

**File: `src/components/dashboard/CompactTodoList.tsx`**

For tasks where `is_auto_executed` is true, show a small sparkle/diamond icon (using Lucide's `Sparkles` icon) next to the task title:

```tsx
{todo.is_auto_executed && (
  <Sparkles className="h-3 w-3 text-primary shrink-0" />
)}
```

The full `TodoList.tsx` page already shows a `Zap` badge for auto-executed tasks — keep that but also add the `Sparkles` icon for consistency on the compact dashboard widget.

## 6. Audio Playback Icon on Session Records

**File: `src/pages/Sessions.tsx`** (line ~1222)

Currently shows a static `Volume2` icon when `audio_url` exists. Change it to a clickable button that plays the audio inline:

```tsx
{session.audio_url && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      const audio = new Audio(session.audio_url!);
      audio.play();
    }}
    className="text-primary hover:text-primary/80 transition-colors"
    title="Play recording"
  >
    <Volume2 className="h-4 w-4" />
  </button>
)}
```

Add state to track which session is currently playing so we can show a stop button and prevent multiple simultaneous playbacks.

## Files Modified

| File | Change |
|------|--------|
| `src/assets/holarc-logo.png` | Replace with new uploaded logo |
| `src/components/layout/Sidebar.tsx` | Increase logo to 62px; add To-Do List nav item |
| `src/components/layout/MobileHeader.tsx` | Increase logo to 50px |
| `src/pages/Auth.tsx` | Increase logo to 117px |
| `src/pages/ForgotPassword.tsx` | Increase logo to 81px |
| `src/pages/ResetPassword.tsx` | Increase logo to 81px |
| `src/pages/Landing.tsx` | Increase logo to 68px |
| `src/components/dashboard/CompactTodoList.tsx` | 2-week filter on done items; AI sparkle icon |
| `src/pages/Sessions.tsx` | Clickable audio playback icon on session records |

