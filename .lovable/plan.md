

# Fix Partner App RLS Error, Vula Icon, Rename, Transfer Button, Admin Logo Fix, Adherence Tab

## 1. Fix RLS / storage upload error for partner apps

**File:** `src/pages/admin/GamificationAdmin.tsx`

Change logo upload path from `partner-apps/${timestamp}.ext` to `${user.id}/partner-apps/${timestamp}.ext` to satisfy the storage RLS policy. Get user via `supabase.auth.getUser()` before upload.

## 2. Add `google_play_url` and `app_store_url` columns

**Migration SQL:** Add two nullable text columns to `moola_partner_apps`.

## 3. Add store URL fields to admin Add/Edit Partner App dialogs

**File:** `src/pages/admin/GamificationAdmin.tsx`

Add input fields for Google Play URL and App Store URL in both the "Add Partner App" dialog and inline edit mode. Include in insert/update mutations.

## 4. Display install links on partner app cards

**Files:** `src/pages/doctor/DoctorRewards.tsx`, `src/pages/patient/MyRewards.tsx`

Show "Get it on Google Play" and "Download on App Store" links on each partner app card when URLs exist.

## 5. Replace green Ⓜ with Vula logo in Rewards Admin

**File:** `src/pages/admin/GamificationAdmin.tsx`

- Import `vulaSymbol` from `@/assets/vula-symbol.png`
- Replace all `Ⓜ` text (lines 311, 422, 614) with `<img src={vulaSymbol} alt="Vula" className="h-5 w-5 inline" />`
- Update the Max Vulas/Visit card (line 310-311) to use the Vula icon instead of the green Ⓜ

## 6. Add "Adherence Rewards" tab to Rewards Admin

**File:** `src/pages/admin/GamificationAdmin.tsx`

Add a new tab after "Visit Rewards" called "Adherence Rewards" with a `Pill` icon. This tab will allow admins to configure Vula rewards for medication adherence (e.g., Vulas per verified dose, streak bonuses for consecutive days). Initial implementation: a simple config table mirroring the Visit Rewards pattern with fields for medication category, Vulas awarded per verified dose, and active toggle.

**Migration SQL:** Create `moola_adherence_configs` table:
- `id` uuid PK
- `medication_category` text
- `lollipops_awarded` integer default 1
- `description` text
- `is_active` boolean default true
- `created_at` timestamptz
- RLS: admin-only insert/update/delete, authenticated select

## Technical Summary

| File | Change |
|------|--------|
| Migration SQL | Add `google_play_url`, `app_store_url` to `moola_partner_apps`; create `moola_adherence_configs` table |
| `src/pages/admin/GamificationAdmin.tsx` | Fix upload path; add store URL fields; replace Ⓜ with Vula icon; add Adherence Rewards tab |
| `src/pages/doctor/DoctorRewards.tsx` | Show app store install links on partner app cards |
| `src/pages/patient/MyRewards.tsx` | Show app store install links on partner app cards |

