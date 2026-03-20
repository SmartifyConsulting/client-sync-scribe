

# Plan: Fix Profile Picture Update & Clarify Holarchive Tabs

## Issue 1: Profile Picture Not Visually Updating

The upload succeeds (confirmed in network requests — status 200, profile patched with new cache-busted URL). The problem is that `fetchProfile` updates the `profile` state, but the `AvatarImage` component may not visually refresh because the browser caches the previous image despite the timestamp query parameter.

**Fix**: Add a `key` prop to the `AvatarImage` component that includes the avatar URL (or timestamp), forcing React to unmount/remount the image element when the URL changes. Also apply the same fix to the sidebar avatar.

### Files to modify:
- `src/pages/Profile.tsx` (line ~450): Add `key={profile?.avatar_url}` to `AvatarImage`
- `src/components/layout/Sidebar.tsx`: Add `key={profile?.avatar_url}` to the sidebar `AvatarImage`

## Issue 2: Holarchive Tabs Not All Visible

This is **not a bug**. Georgia is currently on the `/profile` page, which for patients shows only 2 tabs: "Personal" and "Preferences". The full 4-tab Holarchive (Personal Information, Medical Information, My Documents, My Doctors) is accessed via the **"My Holarchive"** link in the sidebar, which navigates to `/patient/details`.

No code change needed — just navigating to "My Holarchive" in the sidebar will show all 4 tabs.

## Technical Details

The `AvatarImage` uses Radix UI's `Avatar.Image`, which renders a native `<img>`. When the `src` changes only by query parameter, the browser may serve the cached version. Using a React `key` forces a fresh DOM element.

