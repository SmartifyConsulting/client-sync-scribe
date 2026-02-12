

# Profile & User Management Improvements

## 1. Digital Signature Preview with Font and Color Options

Replace the current plain text message in the Digital Signature section with an interactive preview showing how the signature will appear on documents.

**Changes in `src/pages/Profile.tsx`:**
- Add two new state fields to formData: `signature_font` (default: `'sans'`) and `signature_color` (default: `'black'`)
- Add these to the autosave fields so they persist to the profiles table
- Replace the current Clock icon + text with:
  - A live preview box showing the doctor's name + current date/time formatted as the signature
  - A dropdown to select from 5 fonts: Sans (default), Serif, Cursive, Monospace, Handwriting (using Google Fonts or system fonts)
  - A toggle/selector for Navy Blue or Black text color
- The preview renders the name in the selected font and color

**Database migration:**
- Add `signature_font text DEFAULT 'sans'` and `signature_color text DEFAULT 'black'` columns to the `profiles` table

**Changes in `src/hooks/useProfile.ts`:**
- Add `signature_font` and `signature_color` to the Profile interface

## 2. Admin Can Edit User Records (Email Editing)

The admin can already edit name and role. Add email editing capability for admins in the User Management table.

**Changes in `src/pages/admin/UserManagement.tsx`:**
- Add `email` field to `EditState` interface
- When editing, show an editable Input for email
- On save, call `supabase.auth.admin.updateUserById()` -- however since client-side cannot call admin APIs, instead use `supabase.functions.invoke('admin-update-email')` via a new edge function
- Alternative simpler approach: use `supabase.auth.updateUser()` scoped to the admin's session -- this only works for the current user. For other users, create a small edge function that uses the service role key to update another user's email

**New edge function: `supabase/functions/admin-update-email/index.ts`**
- Accepts `{ userId, newEmail }` in the request body
- Validates the caller is an admin (check `user_roles` table)
- Uses the Supabase Admin client (service role key) to call `adminAuthClient.updateUserById(userId, { email: newEmail })`
- Returns success/error

## 3. Break Full Name into First Name and Last Name

Split the single "Full Name" field into "First Name" and "Last Name" in the UI, but continue storing the combined value as `full_name` in the database to avoid a massive migration across 31+ files.

**Changes in `src/pages/Profile.tsx`:**
- Replace the single `full_name` field in formData with `first_name` and `last_name`
- On profile load, split `profile.full_name` by the first space: everything before = first name, everything after = last name
- On autosave, combine as `${first_name} ${last_name}`.trim() and save to `full_name`
- Update the UI to show two side-by-side inputs: "First Name" and "Last Name"
- The avatar label continues to show the combined full name

**Changes in `src/pages/admin/UserManagement.tsx`:**
- Split the Name column into "First Name" and "Last Name" in the edit state
- When editing, show two inputs side by side
- On save, combine into `full_name`

## 4. Partner Created as Pending User in User Management

When a doctor adds a practice partner, automatically create a profile and user_roles entry so the partner appears in User Management as "Pending". When the partner accepts the invitation and sets a password, they become "Active".

**Database migration:**
- Add `status text DEFAULT 'active'` column to the `profiles` table to track active/pending state

**Changes in `src/pages/Profile.tsx` (addPartner function):**
- After inserting the partner record and sending the invitation, the edge function `send-user-invitation` should handle creating the pending user
- Update the invitation flow: when a partner email is provided, the edge function creates an auth user (with `supabase.auth.admin.createUser`) marked with a temporary password or invite link, inserts a profile with `status: 'pending'`, and assigns them the `doctor` role

**Changes in `supabase/functions/send-user-invitation/index.ts`:**
- Add logic: when `isPracticePartner: true` is passed, create the user in auth, create their profile as pending, assign doctor role
- The invitation email includes a link to set their password

**Changes in `src/pages/admin/UserManagement.tsx`:**
- Add a "Status" column showing Active/Pending badges
- Update `get_users_admin` RPC function to include the profile status field

**Database migration for `get_users_admin` function:**
- Update the function to also return `p.status` so the admin table can display it

## 5. "Add New Partner" Button with Save/Edit Per Record

Replace the always-visible partner form with a collapsible form triggered by an "Add New Partner" button. Each partner record gets dedicated Save and Edit buttons.

**Changes in `src/pages/Profile.tsx`:**
- Add `showAddPartnerForm` boolean state (default: false)
- Replace the always-visible dashed-border form with:
  - An "Add New Partner" button (with Plus icon) that toggles the form visibility
  - When clicked, the form appears with the fields + a "Save Partner" button and a "Cancel" button
  - On save, the form hides and resets
- Each existing partner card already has Edit (pencil) and Delete (trash) icons -- keep these but ensure the edit mode shows a "Save" button (check icon) and "Cancel" (X icon) as it currently does

## Technical Summary

### Database Migrations
1. Add `signature_font text DEFAULT 'sans'` to profiles
2. Add `signature_color text DEFAULT 'black'` to profiles  
3. Add `status text DEFAULT 'active'` to profiles
4. Update `get_users_admin()` function to return `p.status`

### New Edge Function
- `admin-update-email`: Allows admins to change another user's email via service role key

### Files Modified
- `src/pages/Profile.tsx` -- signature preview, first/last name split, partner form toggle, autosave updates for new fields
- `src/pages/admin/UserManagement.tsx` -- email editing, first/last name columns, status column
- `src/hooks/useProfile.ts` -- add new fields to Profile interface
- `supabase/functions/send-user-invitation/index.ts` -- handle practice partner user creation
- `supabase/functions/admin-update-email/index.ts` -- new function

