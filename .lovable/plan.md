## Goal

Eliminate the duplication between `/admin/users` and `/admin/holarchelp-providers` by merging them into a single **User Management** screen at `/admin/users`, where the existing HolarcHelp Providers UI gains a new **Users** tab.

## Changes

### 1. `src/pages/admin/HolarcHelpProviders.tsx` → becomes the unified User Management screen
- Rename page heading to **"User Management"**.
- Tabs become: **Users** | **Hospitals** | **Ambulance Providers** (Users is the default tab).
- The **Users** tab renders the full content currently in `src/features/admin/pages/UserManagement.tsx` (search, filters, inline editing, role toggles, etc.) — extracted into a `<UsersTab />` component so this file stays manageable.
- The Hospitals and Ambulance tabs keep their current behavior unchanged.

### 2. Routing (`src/App.tsx`)
- `/admin/users` → renders the merged screen (the page formerly known as `HolarcHelpProviders`).
- Remove the separate `/admin/holarchelp-providers` route, OR keep it as a redirect to `/admin/users` so existing back-links from `HolarcHelpAccountability` and `HolarcHelpProviderIncidents` still work. Plan: **redirect** to avoid breaking those back buttons.
- Drop the `HolarcHelpProviders` import in favor of importing the renamed component.

### 3. Sidebar (`src/components/layout/Sidebar.tsx`)
- The existing single "Users" entry pointing to `/admin/users` is kept. No new entry needed (the providers page no longer has its own sidebar link — confirmed: it isn't in the sidebar today, only reached via Admin hub / accountability links).

### 4. Cleanup
- Delete `src/features/admin/pages/UserManagement.tsx` after extracting its content into `src/features/admin/components/UsersTab.tsx` (used by the merged page).
- Delete the shim `src/pages/admin/UserManagement.tsx` (no longer needed once `/admin/users` points to the merged page).
- Update internal back-links in `HolarcHelpAccountability.tsx` and `HolarcHelpProviderIncidents.tsx` from `/admin/holarchelp-providers` → `/admin/users`.
- Update `src/modules/holarchelp/README.md` references.

## Out of scope
- No changes to user role logic, RLS, edge functions, or provider data model.
- No visual redesign beyond renaming the heading and reordering tabs.

## Files touched
- `src/pages/admin/HolarcHelpProviders.tsx` (rename heading, add Users tab) — or rename file to `UserManagementPage.tsx`; will keep filename for minimal churn and just update import.
- `src/features/admin/components/UsersTab.tsx` (new, extracted from current UserManagement)
- `src/features/admin/pages/UserManagement.tsx` (deleted)
- `src/pages/admin/UserManagement.tsx` (deleted)
- `src/App.tsx` (route swap + redirect)
- `src/pages/admin/HolarcHelpAccountability.tsx`, `src/pages/admin/HolarcHelpProviderIncidents.tsx` (back-link path update)
- `src/modules/holarchelp/README.md` (doc update)
