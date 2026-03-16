

# Reset All User Passwords to "Password123"

## Approach

Create a new edge function `admin-reset-passwords` that:
1. Verifies the caller is an admin (same pattern as `admin-update-email`)
2. Lists all users via `supabase.auth.admin.listUsers()`
3. Loops through each user and calls `supabase.auth.admin.updateUserById(userId, { password: "Password123" })`
4. Returns a summary of how many users were updated

Then invoke it from the User Management page (or directly after deploy).

## Files

### New: `supabase/functions/admin-reset-passwords/index.ts`
- Same auth/admin verification pattern as `admin-update-email`
- Fetches all users, updates each password to "Password123"
- Returns count of updated users

### Modified: `src/pages/admin/UserManagement.tsx`
- Add a "Reset All Passwords" button (for testing convenience)
- Calls `supabase.functions.invoke('admin-reset-passwords')`
- Shows toast with result

## Security Note
This is a testing-only function. It should be removed or disabled before production use.

