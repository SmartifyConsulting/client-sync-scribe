

# Plan: Merge Profile into Avatar Icon & Fix Icon Styling

## What Changes

### 1. Dashboard Avatar → Profile Popover (both Doctor & Patient)

Replace the current `<Link to="/profile">` avatar with a `<Popover>` that opens a dropdown menu when clicked. The popover shows:
- User name + role label
- "View Profile" link → `/profile`
- "Settings" link → `/settings`  
- "Sign Out" button
- CPD badge (doctors only)

This removes the need for the separate logout button next to the avatar.

### 2. Icon Styling (already correct)

Looking at the code, the mic and bell icons already use `bg-secondary` (terracotta) circles with white icons. These are already styled correctly from a previous change. No updates needed here.

### 3. Patient Dashboard — Same Popover Treatment

Apply the same avatar popover pattern to `PatientDashboard.tsx`, replacing any direct profile link with the popover menu.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Replace avatar Link + LogOut button with a Popover containing profile/settings/logout menu |
| `src/pages/patient/PatientDashboard.tsx` | Same avatar popover treatment |

## Dashboard Header After Change
```
[Mic 🟠] [Bell 🟠] [Avatar → Popover{ Profile, Settings, Sign Out }]
```

The standalone LogOut button is removed since it moves into the avatar popover.

