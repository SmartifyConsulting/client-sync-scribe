

# Plan: Dashboard Header, Layout & Silence Fix

## Changes

### 1. Dashboard header — Name links to Profile (`src/pages/Dashboard.tsx`)
- Change the greeting from `{greeting}, {getDisplayName()}` to `{greeting}, <Link to="/profile">{profile?.full_name} Profile</Link>` where the full name + "Profile" text is styled in `text-primary` (aqua/teal)
- Remove the "View Profile" link from the avatar popover menu (keep Settings and Sign Out only)

### 2. Sidebar — Remove Profile button (`src/components/layout/Sidebar.tsx`)
- Remove the Profile `<NavLink>` from the bottom section (lines 162-176) since users now access profile from the dashboard greeting
- The avatar + name display at top of bottom section remains as-is

### 3. Reorder: Recent Activity below To-Do List (`src/pages/Dashboard.tsx`)
- In the right column, swap the order:
```tsx
<div>
  {isDoctor && <CompactTodoList />}
  <RecentActivity />
</div>
```
- Remove the `mt-4` from CompactTodoList since it will now be first, and add `mt-4` to RecentActivity instead

### 4. Fix silence recording — skip transcription for empty audio (`src/components/dashboard/CompactTodoList.tsx`)
- In `processAudio`, before sending to transcribe, check the audio blob duration/size. If the blob is very small (< ~1KB of actual audio data beyond the webm header), skip transcription entirely and show no toast or a simple "Nothing captured" toast
- This prevents Whisper from hallucinating text (like Japanese phrases) from silence
- Approximate check: if `audioBlob.size < 5000` (under ~5KB), skip processing

### Files

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Name as aqua Profile link, remove View Profile from popover, swap RecentActivity/CompactTodoList order |
| `src/components/layout/Sidebar.tsx` | Remove Profile NavLink |
| `src/components/dashboard/CompactTodoList.tsx` | Add minimum audio size check before transcription, remove `mt-4` |

