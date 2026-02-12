# Add "Invite User" Button to User Management Page

## Problem

The User Management page (`/admin/users`) has no button to add or invite new users. The `InviteUserDialog` component already exists and works (search for users or invite by email), but it is simply not placed on this page.

The signature fonts are limited. 

## Solution

Import and render the `InviteUserDialog` component on the User Management page, next to the page title. After a successful invitation, refresh the user list to show any newly created pending users.

Replace the current signature fonts with these: Great Vibes; Dancing Script; Edwardian Script; Rock Salt; Alex Brush

## Changes

### `src/pages/admin/UserManagement.tsx`

- Import `InviteUserDialog` from `@/components/InviteUserDialog`
- Add the `<InviteUserDialog />` button in the header area, next to the title/description
- Optionally pass a callback to refresh the user list after an invitation is sent (or simply re-fetch on dialog close)
- Replace existing signature fonts with the five new ones.

## Technical Details

The `InviteUserDialog` component:

- Lets admins search for existing users by name
- If no user is found, offers email-based invitation
- Calls the `send-user-invitation` edge function which handles both in-app notifications and email invitations
- For practice partners, also creates a pending user record

No database or edge function changes are needed.