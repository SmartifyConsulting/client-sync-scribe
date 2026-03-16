

# Plan: Profile Label, Greeting Fix, and Moola Transfer System

## 1. Sidebar Profile Link — "My Profile" instead of full name

**File:** `src/components/layout/Sidebar.tsx` (line 157)

Change `{profile?.full_name || "User"} Profile` to just `My Profile`.

## 2. Patient Dashboard Greeting — First Name Only

**File:** `src/pages/patient/PatientDashboard.tsx` (line 211)

Change `Welcome back, {profile?.full_name || "Patient"}` to use only the first name:
```
Welcome back, {profile?.full_name?.split(" ")[0] || "Patient"}
```

The doctor Dashboard (`src/pages/Dashboard.tsx`) already uses `getDisplayName()` which formats as "Dr. Surname" — no change needed there.

## 3. Moola Transfer System

### Database Changes (migration)

**New table: `moola_partner_apps`** — admin-managed list of apps that accept Moolas
- `id`, `name`, `logo_url`, `is_active`, `created_at`
- RLS: anyone authenticated can SELECT; only admins can INSERT/UPDATE/DELETE

**New table: `moola_transfers`** — transfer history
- `id`, `user_id` (sender), `partner_app_id`, `amount`, `created_at`
- RLS: users can SELECT/INSERT their own records

```sql
CREATE TABLE public.moola_partner_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moola_partner_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active partner apps" ON public.moola_partner_apps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage partner apps" ON public.moola_partner_apps FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.moola_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_app_id uuid NOT NULL REFERENCES public.moola_partner_apps(id),
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moola_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transfers" ON public.moola_transfers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create transfers" ON public.moola_transfers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
```

### UI: Transfer Moolas in My Rewards

**File:** `src/pages/patient/MyRewards.tsx`

- Add a "Transfer Moolas" button next to the Total Moolas card
- Clicking opens a dialog where the patient selects a partner app and enters an amount
- On submit: insert into `moola_transfers`, and insert a negative `patient_rewards` entry (or a dedicated deduction) to reduce the Moola balance
- Add a "Transfer History" tab showing past transfers with date, app, and amount

### Admin: Manage Partner Apps

**File:** `src/pages/admin/GamificationAdmin.tsx`

- Add a "Partner Apps" section where admins can add/edit/deactivate apps that accept Moolas

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Change profile link text to "My Profile" |
| `src/pages/patient/PatientDashboard.tsx` | Use first name only in greeting |
| `src/pages/patient/MyRewards.tsx` | Add Transfer Moolas button, dialog, and Transfer History tab |
| `src/pages/admin/GamificationAdmin.tsx` | Add Partner Apps management section |
| Database migration | Create `moola_partner_apps` and `moola_transfers` tables with RLS |

