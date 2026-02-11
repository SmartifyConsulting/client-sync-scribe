
# Grant Admin Rights and Add User Management Page

## Overview
Grant admin role to info@georgiaadams.co.za and create a new "User Management" admin page where you can see all registered users, their roles (doctor/patient), and basic info.

## Step 1: Grant Admin Role (Database)
Insert an admin role for user `9ceb1207-472c-447c-878c-17cd321b61b7` (info@georgiaadams.co.za) into the `user_roles` table.

## Step 2: Create User Management Admin Page
Create `src/pages/admin/UserManagement.tsx` that:
- Checks admin access (same pattern as PricingAdmin)
- Fetches all profiles joined with user_roles to show each user's email, name, and role
- Displays a table with columns: Name, Email, Role, Joined Date
- Shows role as a badge (Doctor / Patient / Admin)

## Step 3: Add Database Function for Admin User Listing
Create a security definer function `get_all_users_with_roles()` that returns profiles + roles data. This avoids RLS restrictions since the profiles table is user-scoped for updates but readable by authenticated users.

We also need to query `auth.users` for email addresses (not stored in profiles). A security definer function will handle this safely.

## Step 4: Update Navigation
- Add a "Users" item to `adminNavItems` in `Sidebar.tsx` (using the `Users` icon)
- Add the route `/admin/users` in `App.tsx`

## Technical Details

### Database Migration
```sql
-- Security definer function to get users with roles (admin only)
CREATE OR REPLACE FUNCTION public.get_users_admin()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as user_id,
    u.email::text,
    p.full_name,
    COALESCE(ur.role::text, 'none') as role,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC
$$;
```

### Data Insert
Insert admin role for info@georgiaadams.co.za:
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('9ceb1207-472c-447c-878c-17cd321b61b7', 'admin');
```

### New File: `src/pages/admin/UserManagement.tsx`
- Admin guard check (same as PricingAdmin)
- Call `supabase.rpc('get_users_admin')` to fetch all users
- Render a table with Name, Email, Role badge, and Join Date
- Color-coded role badges: blue for doctor, green for patient, red for admin

### Sidebar Update
Add `{ icon: Users, label: "Users", to: "/admin/users" }` to `adminNavItems`.

### Route Update
Add `<Route path="/admin/users" element={<UserManagement />} />` under admin routes in App.tsx.
