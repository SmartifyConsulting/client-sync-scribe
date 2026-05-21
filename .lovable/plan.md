## 1. SOS map shows hospital in Nigeria — root cause + fix

Traced incident `ba2add7b…` end to end. Dispatch is correct — this is a UI rendering bug.

**Why "not near Lonehill":** GPS at SOS time recorded **-26.1117, 28.0144** (Northcliff / Westcliff), not Lonehill. SOS uses live device GPS, not the saved home address. The 16 offers produced by `dispatch-sos` were all in Johannesburg (4.6 km – 19.3 km). No Lagos provider was ever offered.

**Why a Lagos hospital appears on the map:** The accepted responder is **Netcare Rosebank (a hospital)**, so `incidents.assigned_provider_id` points at a hospital row and `destination_hospital_id` is `NULL`. `SosLiveMap.tsx` then:

- Provider fallback (lines 78–88) assumes the assigned id is always an **ambulance**, queries the ambulance table by that id, gets `null`, and gives up.
- Hospital fallback (lines 118–135) sees `destination_hospital_id` is null and runs an "auto-pick nearest approved hospital" over **every approved hospital worldwide** with no country/region/radius cap. Lagos LASUTH (6.6, 3.35) ends up in the candidate list and, with state churn between two awaited queries, briefly wins — producing the "4114.7 km" pill alongside the correct 4.6 km Rosebank pill.

**Fix in `src/modules/holarchelp/components/SosLiveMap.tsx`:**
1. When `assigned_provider_id` is set, look it up in **both** `holarchelp_ambulance_providers` and `holarchelp_hospitals`. If hospital → set `hospital` (and mirror to `provider` with `kind: "hospital"`) and skip auto-pick.
2. Only auto-pick when there's neither `destination_hospital_id` nor `assigned_provider_id`.
3. Cap auto-pick candidates to **≤ 150 km** of the patient. Beyond that → render nothing.

**Fix in `supabase/functions/dispatch-sos/index.ts`:** replace radius ladder `[50, 150, 500, 5000]` with `[50, 150]`. If nothing within 150 km → `offered: 0` so the existing "No ambulance has accepted — call 10177" panel shows instead.

## 2. Reset Eldette 911's password to `Password123`

Use the existing admin user-management edge function (service-role) to set the password for the user whose `full_name` matches "Eldette 911". If multiple matches, I'll confirm the email first.

## 3. Auto-generate + email passwords for new test users

In the User Admin **Create user** flow:
- Add an **Auto-generate password** toggle (default on for MVP).
- Generate a 14-char password (mixed case + digits + symbols), create the user with it, and **email** it to the user via the existing transactional email function with a "Change on first login" note.
- Show the generated password **once** in a copy-to-clipboard toast after creation; never display it again.
- When toggle is off, keep the manual-password field.

Files: `src/features/admin/components/UsersTab.tsx` (or CreateUserDialog) + admin user-create edge function (accept `auto_generate: true`, trigger email).

## 4. Rename "Ambulance" → "Emergency Response" throughout the app (UI text only)

- Replace user-visible "Ambulance" / "Ambulances" with "Emergency Response" / "Emergency Responders".
- Where space is tight (badges, mobile nav, table headers, pills, marker tooltips, avatar role chips), use **ER**.
- Icons (`Ambulance` from lucide-react) stay.
- Out of scope: DB table/column names (`holarchelp_ambulance_*`), route slugs (`/provider/ambulance/*`), edge function names, and the `provider_kind: "ambulance"` enum string — all kept stable for API compatibility.

## 5. SOS button must hide on `/admin/*` for `info@georgiaadams.co.za`

**Symptom:** When this user navigates to **Admin**, the **SOS** button disappears from the nav menu.

**Likely cause:** The SOS nav entry is gated on either (a) the user's primary role resolving to a non-patient role while on `/admin/*`, or (b) the multi-role resolver flipping from `patient` to `admin` once the admin route mounts (per the `patient > doctor > admin` hierarchy memory, admin is *lowest* priority — but the nav itself swaps to admin chrome on `/admin/*` and drops patient-only items). The SOS item is rendered inside the patient sidebar, so when admin chrome takes over, SOS is dropped.

**Fix:**
- Make the **SOS** entry **route-independent**: render it for any user who has `holarchelp_enabled = true` (the existing `holarchelp_user_enabled` check), regardless of which nav shell is active (patient, doctor, or admin).
- Concretely: lift the SOS item out of the patient-only sidebar branch and into a shared nav slot rendered above the role-specific items in `src/components/layout/*` (Sidebar + mobile bottom nav). Same icon, same `/patient/holarchelp` destination.
- Verify with `info@georgiaadams.co.za` on `/admin/users` that the SOS button remains visible.

Out of scope: no role-model changes, no DB changes.

## Technical details

- Files touched:
  - `src/modules/holarchelp/components/SosLiveMap.tsx`
  - `supabase/functions/dispatch-sos/index.ts`
  - Admin user-create edge function + `UsersTab.tsx` / CreateUserDialog
  - Layout: `src/components/layout/*` (sidebar + mobile nav) for the SOS-always-visible fix
  - UI copy across `src/modules/holarchelp/**` and admin pages for the rename
- One edge function call to reset Eldette 911's password.
- No DB schema changes.
